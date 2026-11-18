"use server";

import { audit } from "./audit";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { DIGITAL_WEBSITES } from "@/config/digital";
import { AGENT_TIERS, OPTIONS } from "@/config/pricing";
import { AGENTS_PRICING_KEY, getAgentsPricingOverrides, type AgentsPricingOverrides } from "@/lib/agents-pricing";
import {
  CATALOGUE_COMMERCIAL_KEY,
  getCatalogueCommercial,
  sanitizeCommercialMap,
  type CatalogueCommercialEntry,
  type CatalogueCommercialMap,
} from "@/lib/catalogue-commercial";
import { DIGITAL_PRICING_KEY, getDigitalPricingOverrides, type DigitalPricingOverrides } from "@/lib/digital-pricing";
import { isAdmin } from "@/lib/auth/session";
import { ensureIndex } from "@/lib/chatbot/rag";
import { createClient } from "@/lib/supabase/server";
import { getVideoConfig, type PricingOverrides } from "@/lib/video-config";
import { savePricing } from "./actions";
import { loadCatalogue } from "./catalogue";

/**
 * Saves the edited prices of /admin/catalogue. The browser sends only { fieldKey: number } for the fields it
 * changed; everything else is re-read from the database here, so untouched values (e.g. video duration
 * supplements) are never reset. Unknown keys and invalid numbers are rejected.
 */

type Result = { success: true } | { success: false; error: "forbidden" | "invalid" | "failed" };
const MAX_PRICE = 1_000_000;

export async function saveCatalogue(changes: Record<string, number>): Promise<Result> {
  if (!(await isAdmin())) return { success: false, error: "forbidden" };
  const entries = Object.entries(changes ?? {});
  if (!entries.length) return { success: true };
  if (entries.length > 500) return { success: false, error: "invalid" };

  try {
    return await writeCatalogue(entries);
  } catch (cause) {
    console.error("saveCatalogue crashed:", cause);
    return { success: false, error: "failed" };
  }
}

const COMMERCIAL_PARTS = new Set(["costMonthly", "costSetup", "maxDiscountMonthly", "maxDiscountSetup"]);

async function writeCatalogue(entries: [string, number][]): Promise<Result> {
  // Current state, from the database (never from the browser).
  const cfg = await getVideoConfig();
  const knownRows = new Set((await loadCatalogue()).rows.filter((r) => r.commercial).map((r) => r.id));
  const video: Required<PricingOverrides> = {
    depositPercent: cfg.depositPercent,
    qtyDiscounts: { ...cfg.qtyDiscounts },
    options: Object.fromEntries(Object.entries(cfg.options).map(([id, o]) => [id, o.price])),
    services: Object.fromEntries(cfg.services.map((s) => [s.slug, { price: s.price, durations: s.durations?.map((d) => d.extra) }])),
    plans: Object.fromEntries((cfg.marketing?.plans ?? []).filter((p) => p.price !== null).map((p) => [p.key, { price: p.price ?? undefined, setupPrice: p.setupPrice ?? undefined }])),
  };
  const agents: AgentsPricingOverrides = { ...((await getAgentsPricingOverrides()) ?? {}) };
  agents.options = { ...(agents.options ?? {}) };
  agents.tiers = { ...(agents.tiers ?? {}) };
  const digital: DigitalPricingOverrides = { websites: { ...((await getDigitalPricingOverrides())?.websites ?? {}) } };
  const commercial: CatalogueCommercialMap = { ...(await getCatalogueCommercial()) };
  let videoTouched = false;
  let agentsTouched = false;
  let digitalTouched = false;
  let commercialTouched = false;

  for (const [key, raw] of entries) {
    const n = Number(raw);
    const isPct =
      key === "v:deposit" ||
      key.startsWith("v:qty:") ||
      key === "a:annual" ||
      key.includes(":maxDiscount");
    if (!Number.isFinite(n) || n < 0 || n > (isPct ? 100 : MAX_PRICE)) return { success: false, error: "invalid" };
    const v = Math.round(n * 100) / 100;
    const [scope, kind, id, part] = key.split(":");

    if (scope === "c") {
      // c:{rowId}:{costMonthly|costSetup|maxDiscountMonthly|maxDiscountSetup}
      // rowId itself contains ":" (e.g. tier:Starter) — re-parse.
      const match = /^c:(.+):(costMonthly|costSetup|maxDiscountMonthly|maxDiscountSetup)$/.exec(key);
      if (!match) return { success: false, error: "invalid" };
      const rowId = match[1];
      const field = match[2] as keyof CatalogueCommercialEntry;
      if (!knownRows.has(rowId) || !COMMERCIAL_PARTS.has(field)) return { success: false, error: "invalid" };
      commercialTouched = true;
      const cur: CatalogueCommercialEntry = { ...(commercial[rowId] ?? {}) };
      cur[field] = v;
      commercial[rowId] = cur;
      continue;
    }

    if (scope === "v") {
      videoTouched = true;
      if (kind === "deposit") video.depositPercent = v;
      else if (kind === "qty" && id && id in video.qtyDiscounts) video.qtyDiscounts[id] = Math.min(90, v);
      else if (kind === "opt" && id && id in video.options) video.options[id] = v;
      else if (kind === "svc" && id && video.services[id]) video.services[id] = { ...video.services[id], price: v };
      else if (kind === "plan" && id && video.plans[id] && (part === "price" || part === "setup"))
        video.plans[id] = { ...video.plans[id], [part === "price" ? "price" : "setupPrice"]: v };
      else return { success: false, error: "invalid" };
    } else if (scope === "a") {
      agentsTouched = true;
      if (kind === "plan") agents.planMonthly = v;
      else if (kind === "user") agents.userPrice = v;
      else if (kind === "annual") agents.annualDiscountPercent = Math.min(90, v);
      else if (kind === "opt" && OPTIONS.some((o) => o.id === id)) agents.options[id!] = v;
      else if (kind === "tier" && AGENT_TIERS.some((t) => t.name === id && t.price !== null) && (part === "price" || part === "setup"))
        agents.tiers[id!] = { ...agents.tiers[id!], [part === "price" ? "price" : "setupFrom"]: v };
      else return { success: false, error: "invalid" };
    } else if (scope === "d") {
      digitalTouched = true;
      const site = DIGITAL_WEBSITES.find((s) => s.id === id);
      if (kind !== "site" || !site || !part) return { success: false, error: "invalid" };
      const current = { ...(digital.websites?.[site.id] ?? {}) };
      if (part === "price") current.price = v;
      else if (part === "running" && site.runningFrom !== null) current.runningFrom = v;
      else return { success: false, error: "invalid" };
      digital.websites = { ...digital.websites, [site.id]: current };
    } else return { success: false, error: "invalid" };
  }

  if (videoTouched) {
    // Same save path as the Prix tab (sanitizes against config/services-data.js, reindexes the chatbot).
    const res = await savePricing(video);
    if (!res.success) return { success: false, error: res.error === "forbidden" ? "forbidden" : "failed" };
  }
  if (agentsTouched) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    // RLS (site_settings: admin insert/update) re-checks the admin role in the database.
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: AGENTS_PRICING_KEY, value: agents, updated_at: new Date().toISOString(), updated_by: auth.user?.id },
        { onConflict: "key" },
      );
    if (error) {
      console.error("saveCatalogue (agents) failed:", error.message);
      return { success: false, error: "failed" };
    }
    after(() => ensureIndex(true).catch((cause) => console.error("Chatbot reindex failed:", cause)));
  }
  if (digitalTouched) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: DIGITAL_PRICING_KEY, value: digital, updated_at: new Date().toISOString(), updated_by: auth.user?.id },
        { onConflict: "key" },
      );
    if (error) {
      console.error("saveCatalogue (digital) failed:", error.message);
      return { success: false, error: "failed" };
    }
    after(() => ensureIndex(true).catch((cause) => console.error("Chatbot reindex failed:", cause)));
  }
  if (commercialTouched) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          key: CATALOGUE_COMMERCIAL_KEY,
          value: sanitizeCommercialMap(commercial),
          updated_at: new Date().toISOString(),
          updated_by: auth.user?.id,
        },
        { onConflict: "key" },
      );
    if (error) {
      console.error("saveCatalogue (commercial) failed:", error.message);
      return { success: false, error: "failed" };
    }
  }

  // Revalidate public consumers without wiping the whole app layout (that was crashing the admin page).
  for (const path of [
    "/admin/catalogue",
    "/admin",
    "/abonnement",
    "/paiement",
    "/agents-ia",
    "/marketing",
    "/marketing/forfaits",
    "/services",
    "/digital",
    "/projet",
    "/projet/informations",
    "/finaliser",
    "/acompte",
    "/assets/js/services-data.js",
    "/commercial/devis-factures",
    "/commercial",
  ]) {
    revalidatePath(path);
  }
  await audit("catalogue.save", `${entries.length} prix`, { changes: Object.fromEntries(entries) });
  return { success: true };
}
