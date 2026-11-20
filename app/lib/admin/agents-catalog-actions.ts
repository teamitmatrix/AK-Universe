"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { AGENT_CATEGORIES, type AgentCategory } from "@/config/agents";
import { AGENT_ICON_CHOICES, AGENTS_CATALOG_KEY, type CatalogAgent } from "@/config/agents-catalog";
import {
  getAgentsCatalog,
  isStaticAgentId,
  sanitizeCatalogAgent,
  sanitizeCatalogList,
  slugifyAgentId,
} from "@/lib/agents-catalog";
import { isAdmin } from "@/lib/auth/session";
import { ensureIndex } from "@/lib/chatbot/rag";
import { createClient } from "@/lib/supabase/server";
import { audit } from "./audit";

type Result = { success: true; id: string } | { success: false; error: "forbidden" | "invalid" | "duplicate" | "failed" | "notFound" };

export type AgentServiceInput = {
  id?: string;
  name: string;
  role: string;
  headline: string;
  description: string;
  example: string;
  category: AgentCategory;
  icon: string;
  portrait: string;
  heroPortrait: string;
  task1: string;
  task2: string;
  task3: string;
  action: string;
  integrations: string;
  demoClient: string;
  demoAgent: string;
  priceMonthly: string;
  setupFrom: string;
  published: boolean;
};

const PATHS = ["/admin/catalogue", "/agents-ia", "/abonnement", "/paiement", "/commercial/devis-factures", "/commercial"];

function revalidate() {
  for (const path of PATHS) revalidatePath(path);
  revalidatePath("/agents-ia", "layout");
}

function parsePrice(raw: string): number | null {
  const s = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return NaN;
  return Math.round(n * 100) / 100;
}

function parseInput(input: AgentServiceInput, existingId?: string): CatalogAgent | null {
  const name = String(input?.name ?? "").trim().slice(0, 80);
  if (!name) return null;
  const id = (existingId || slugifyAgentId(name)).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48);
  if (!id || id.length < 2 || isStaticAgentId(id)) return null;

  const category = AGENT_CATEGORIES.some((c) => c.id === input.category) ? input.category : "client";
  const icon = (AGENT_ICON_CHOICES as readonly string[]).includes(input.icon) ? input.icon : "sparkle";
  const tasks = [input.task1, input.task2, input.task3]
    .map((label) => String(label ?? "").trim().slice(0, 80))
    .filter(Boolean)
    .map((label) => ({ icon: "check-circle", label }));
  const integrations = String(input.integrations ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 12);
  const demoClient = String(input.demoClient ?? "").trim().slice(0, 280);
  const demoAgent = String(input.demoAgent ?? "").trim().slice(0, 280);
  const priceMonthly = parsePrice(input.priceMonthly);
  const setupFrom = parsePrice(input.setupFrom);
  if (Number.isNaN(priceMonthly) || Number.isNaN(setupFrom)) return null;

  const now = new Date().toISOString();
  const draft = sanitizeCatalogAgent({
    id,
    published: Boolean(input.published),
    name,
    role: String(input.role ?? "").trim().slice(0, 80) || "Agent IA",
    headline: String(input.headline ?? "").trim().slice(0, 120),
    description: String(input.description ?? "").trim().slice(0, 600),
    example: String(input.example ?? "").trim().slice(0, 220),
    category,
    icon,
    portrait: String(input.portrait ?? "").trim().slice(0, 300),
    heroPortrait: String(input.heroPortrait ?? "").trim().slice(0, 300),
    tasks,
    action: String(input.action ?? "").trim().slice(0, 500),
    integrations,
    demo:
      demoClient && demoAgent
        ? [
            { from: "client", text: demoClient },
            { from: "agent", text: demoAgent },
          ]
        : [],
    priceMonthly,
    setupFrom,
    createdAt: now,
    updatedAt: now,
  });
  return draft;
}

async function saveList(list: CatalogAgent[]) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: AGENTS_CATALOG_KEY,
      value: sanitizeCatalogList(list),
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id,
    },
    { onConflict: "key" },
  );
  return error;
}

export async function createAgentService(input: AgentServiceInput): Promise<Result> {
  if (!(await isAdmin())) return { success: false, error: "forbidden" };
  const agent = parseInput(input);
  if (!agent) return { success: false, error: "invalid" };

  try {
    const list = await getAgentsCatalog();
    if (list.some((a) => a.id === agent.id) || isStaticAgentId(agent.id)) {
      return { success: false, error: "duplicate" };
    }
    const error = await saveList([agent, ...list]);
    if (error) {
      console.error("createAgentService failed:", error.message);
      return { success: false, error: "failed" };
    }
    after(() => ensureIndex(true).catch((cause) => console.error("Chatbot reindex failed:", cause)));
    revalidate();
    await audit("agents.catalog.create", agent.id, { name: agent.name, published: agent.published });
    return { success: true, id: agent.id };
  } catch (cause) {
    console.error("createAgentService crashed:", cause);
    return { success: false, error: "failed" };
  }
}

export async function updateAgentService(id: string, input: AgentServiceInput): Promise<Result> {
  if (!(await isAdmin())) return { success: false, error: "forbidden" };
  const rowId = String(id ?? "").trim();
  if (!rowId || isStaticAgentId(rowId)) return { success: false, error: "invalid" };
  const agent = parseInput(input, rowId);
  if (!agent || agent.id !== rowId) return { success: false, error: "invalid" };

  try {
    const list = await getAgentsCatalog();
    const idx = list.findIndex((a) => a.id === rowId);
    if (idx < 0) return { success: false, error: "notFound" };
    agent.createdAt = list[idx]!.createdAt;
    agent.updatedAt = new Date().toISOString();
    const next = [...list];
    next[idx] = agent;
    const error = await saveList(next);
    if (error) {
      console.error("updateAgentService failed:", error.message);
      return { success: false, error: "failed" };
    }
    after(() => ensureIndex(true).catch((cause) => console.error("Chatbot reindex failed:", cause)));
    revalidate();
    revalidatePath(`/agents-ia/${rowId}`);
    await audit("agents.catalog.update", rowId, { name: agent.name, published: agent.published });
    return { success: true, id: rowId };
  } catch (cause) {
    console.error("updateAgentService crashed:", cause);
    return { success: false, error: "failed" };
  }
}

export async function deleteAgentService(id: string): Promise<Result> {
  if (!(await isAdmin())) return { success: false, error: "forbidden" };
  const rowId = String(id ?? "").trim();
  if (!rowId || isStaticAgentId(rowId)) return { success: false, error: "invalid" };

  try {
    const list = await getAgentsCatalog();
    if (!list.some((a) => a.id === rowId)) return { success: false, error: "notFound" };
    const error = await saveList(list.filter((a) => a.id !== rowId));
    if (error) {
      console.error("deleteAgentService failed:", error.message);
      return { success: false, error: "failed" };
    }
    after(() => ensureIndex(true).catch((cause) => console.error("Chatbot reindex failed:", cause)));
    revalidate();
    revalidatePath(`/agents-ia/${rowId}`);
    await audit("agents.catalog.delete", rowId);
    return { success: true, id: rowId };
  } catch (cause) {
    console.error("deleteAgentService crashed:", cause);
    return { success: false, error: "failed" };
  }
}
