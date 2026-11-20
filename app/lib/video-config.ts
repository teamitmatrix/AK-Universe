import "server-only";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import type { AgentOffer } from "@/config/agent-subscriptions";
import type { DigitalWebsite } from "@/config/digital";
import { createPublicClient } from "@/lib/supabase/server";

/*
 * Video services catalogue = config/services-data.js (texts + default prices)
 * merged with the price overrides saved from /admin (site_settings "video_pricing").
 */

export const PRICING_KEY = "video_pricing";

export type Duration = { label: string; extra: number };
export type OptionDef = { label: string; price: number; per?: "video" | "projet"; icon?: string };
export type OptionRef = string | ({ id: string } & Partial<OptionDef>);
export type MarketingItem = { icon: string; title: string; text: string };
export type PlanBlock = {
  icon: string;
  title: string;
  text?: string;
  list?: string[];
};

export type PlanBonusText = {
  text: string;
  strong?: string;
  muted?: boolean;
};

export type Plan = {
  key: string;
  name: string;
  /** Monthly HT price; null = on quote only. */
  price: number | null;
  tagline: string;
  popular?: boolean;
  features?: string[];
  num?: string;
  sub?: string[];
  desc?: string | null;
  setupPrice?: number | null;
  priceTitle?: string;
  priceUnit?: string | null;
  setupLabel?: string;
  onQuote?: boolean;
  blocks?: PlanBlock[];
  bonus?: { title: string; texts: PlanBonusText[] };
};
export type Service = {
  slug: string;
  name: string;
  gold?: string;
  titleTop?: string;
  description?: string;
  benefits?: [string, string][];
  price: number;
  unit?: string;
  priceNote?: string;
  includesTitle?: [string, string];
  includesText?: string;
  includes?: string[];
  priceList?: string[];
  options?: OptionRef[];
  durations?: Duration[];
  qtyChoices?: number[];
  qtyDiscounts?: Record<string, number>;
  qtyLabel?: string;
  /** [singular, plural] quantity word in the visitor's language, when the language needs it ("Video", "Videos"). */
  qtyWords?: [string, string];
  mockup?: number | null;
  duration?: string;
  realisations?: string;
};
export type VideoConfig = {
  depositPercent: number;
  qtyDiscounts: Record<string, number>;
  defaultDurations: Duration[];
  options: Record<string, OptionDef>;
  clients?: string[];
  faq?: { q: string; a: string }[];
  marketing?: {
    benefits?: MarketingItem[];
    plans?: Plan[];
    included?: MarketingItem[];
    customQuote?: { title: string; text: string; primaryCta: string; secondaryCta: string };
  };
  services: Service[];
  /** Live digital website prices (defaults + admin catalogue overrides). */
  digitalWebsites?: DigitalWebsite[];
  /** Solo Agents IA subscriptions for Mon projet cart. */
  agentOffers?: AgentOffer[];
  [key: string]: unknown;
};

/** Only the numbers admin.html can edit. */
export type PricingOverrides = {
  depositPercent?: number;
  qtyDiscounts?: Record<string, number>;
  options?: Record<string, number>;
  /** slug → base price and, for services with their own durations, the extra per duration */
  services?: Record<string, { price?: number; durations?: number[] }>;
  /** Marketing package key → monthly price and set-up fee (admin catalogue). */
  plans?: Record<string, { price?: number; setupPrice?: number }>;
};

let defaults: { mtime: number; config: VideoConfig } | null = null;

export function loadDefaultConfig(): VideoConfig {
  const file = path.join(process.cwd(), "config", "services-data.js");
  const mtime = fs.statSync(file).mtimeMs;
  if (defaults?.mtime !== mtime) {
    const sandbox = { window: {} as { AKU_CONFIG?: VideoConfig } };
    vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { timeout: 1000 });
    if (!sandbox.window.AKU_CONFIG) throw new Error("config/services-data.js did not define AKU_CONFIG");
    defaults = { mtime, config: sandbox.window.AKU_CONFIG };
  }
  return structuredClone(defaults.config);
}

const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function applyOverrides(config: VideoConfig, o: PricingOverrides | null | undefined): VideoConfig {
  if (!o) return config;
  if (isPrice(o.depositPercent)) config.depositPercent = Math.min(100, o.depositPercent);
  for (const [qty, pct] of Object.entries(o.qtyDiscounts ?? {})) {
    if (qty in config.qtyDiscounts && isPrice(pct)) config.qtyDiscounts[qty] = Math.min(90, pct);
  }
  for (const [id, price] of Object.entries(o.options ?? {})) {
    if (config.options[id] && isPrice(price)) config.options[id].price = price;
  }
  for (const service of config.services) {
    const so = o.services?.[service.slug];
    if (!so) continue;
    if (isPrice(so.price)) service.price = so.price;
    so.durations?.forEach((extra, i) => {
      if (service.durations?.[i] && isPrice(extra)) service.durations[i].extra = extra;
    });
  }
  // Packages "on quote" (price null) stay on quote: only priced packages can be changed.
  for (const plan of config.marketing?.plans ?? []) {
    const po = o.plans?.[plan.key];
    if (!po) continue;
    if (plan.price !== null && isPrice(po.price)) plan.price = po.price;
    if (plan.setupPrice != null && isPrice(po.setupPrice)) plan.setupPrice = po.setupPrice;
  }
  return config;
}

export async function getPricingOverrides(): Promise<PricingOverrides | null> {
  try {
    const { data, error } = await createPublicClient()
      .from("site_settings")
      .select("value")
      .eq("key", PRICING_KEY)
      .maybeSingle();
    if (error) throw error;
    return (data?.value as PricingOverrides) ?? null;
  } catch (cause) {
    // Never take the site down because settings are unreachable: fall back to defaults.
    console.error("Could not load video pricing overrides:", cause);
    return null;
  }
}

export async function getVideoConfig() {
  const config = applyOverrides(loadDefaultConfig(), await getPricingOverrides());
  // Soft-deleted catalogue rows (admin “Supprimer”) stay out of public offers.
  try {
    const { getCatalogueCommercial } = await import("@/lib/catalogue-commercial");
    const commercial = await getCatalogueCommercial();
    config.services = config.services.filter((s) => !commercial[`svc:${s.slug}`]?.hidden);
    if (config.marketing?.plans) {
      config.marketing.plans = config.marketing.plans.filter((p) => !commercial[`plan:${p.key}`]?.hidden);
    }
    for (const id of Object.keys(config.options)) {
      if (commercial[`opt:${id}`]?.hidden) delete config.options[id];
    }
  } catch (cause) {
    console.error("Could not apply catalogue visibility:", cause);
  }
  try {
    const { getAgentOffers } = await import("@/lib/agent-offers");
    config.agentOffers = await getAgentOffers();
  } catch (cause) {
    console.error("Could not load agent offers:", cause);
  }
  return config;
}

/** Attach live digital website prices for cart/pages that need both catalogues. */
export function withDigitalWebsites(config: VideoConfig, websites: DigitalWebsite[]): VideoConfig {
  return { ...config, digitalWebsites: websites };
}
