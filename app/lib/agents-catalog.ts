import "server-only";
import {
  AGENT_CATEGORIES,
  type Agent,
  type AgentCategory,
  type AgentTask,
  agents as staticAgents,
} from "@/config/agents";
import {
  AGENT_ICON_CHOICES,
  AGENTS_CATALOG_KEY,
  type CatalogAgent,
} from "@/config/agents-catalog";
import { createPublicClient } from "@/lib/supabase/server";

export { AGENT_ICON_CHOICES, AGENTS_CATALOG_KEY, type CatalogAgent } from "@/config/agents-catalog";

/**
 * Admin-created Agents IA services (Catalogue & prix → +).
 * Stored in site_settings "agents_catalog". Published entries appear on /agents-ia
 * and /agents-ia/[id] only — never marketing or digital.
 */

const CATEGORIES = new Set(AGENT_CATEGORIES.map((c) => c.id));
const ICONS = new Set<string>(AGENT_ICON_CHOICES);

const text = (v: unknown, max: number) => {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
};

const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1_000_000;

export function slugifyAgentId(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "agent";
}

function sanitizeTasks(raw: unknown): AgentTask[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentTask[] = [];
  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== "object") continue;
    const label = text((item as AgentTask).label, 80);
    if (!label) continue;
    const iconRaw = text((item as AgentTask).icon, 40) || "check-circle";
    out.push({ icon: ICONS.has(iconRaw) || iconRaw === "check-circle" || iconRaw === "file-text" ? iconRaw : "check-circle", label });
  }
  return out;
}

function sanitizeDemo(raw: unknown): CatalogAgent["demo"] {
  if (!Array.isArray(raw)) return [];
  const out: CatalogAgent["demo"] = [];
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const from = (item as { from?: string }).from === "client" ? "client" : (item as { from?: string }).from === "agent" ? "agent" : null;
    const line = text((item as { text?: string }).text, 280);
    if (!from || !line) continue;
    out.push({ from, text: line });
  }
  return out;
}

function defaultDemo(name: string): CatalogAgent["demo"] {
  return [
    { from: "client", text: `Bonjour, pouvez-vous m'aider ?` },
    { from: "agent", text: `Bien sûr. Je suis ${name}, je m'occupe de votre demande.` },
  ];
}

export function sanitizeCatalogAgent(raw: unknown): CatalogAgent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id, 48).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const name = text(r.name, 80);
  if (!id || !name || id.length < 2) return null;
  if (staticAgents.some((a) => a.id === id)) return null;

  const category = CATEGORIES.has(r.category as AgentCategory) ? (r.category as AgentCategory) : "client";
  const icon = ICONS.has(String(r.icon)) ? String(r.icon) : "sparkle";
  const portrait = text(r.portrait, 300) || "/assets/img/agents/milo-card.jpg";
  const heroPortrait = text(r.heroPortrait, 300) || "/assets/img/agents/milo-hero.jpg";
  const tasks = sanitizeTasks(r.tasks);
  const role = text(r.role, 80) || "Agent IA";
  const example = text(r.example, 220) || text(r.description, 220) || role;
  const description = text(r.description, 600) || example;
  const headline = text(r.headline, 120) || `Votre agent ${role.toLowerCase()}`;
  const action = text(r.action, 500) || `${name} prend en charge la demande et vous tient informé.`;
  const integrations = Array.isArray(r.integrations)
    ? r.integrations.map((x) => text(x, 60)).filter(Boolean).slice(0, 12)
    : [];
  const demo = sanitizeDemo(r.demo);
  const createdAt = text(r.createdAt, 40) || new Date().toISOString();
  const updatedAt = text(r.updatedAt, 40) || createdAt;

  return {
    id,
    published: r.published !== false,
    name,
    role,
    headline,
    description,
    example,
    category,
    icon,
    // Same-origin public assets only (Next/Image + no remote config required).
    portrait: portrait.startsWith("/assets/") ? portrait : "/assets/img/agents/milo-card.jpg",
    heroPortrait: heroPortrait.startsWith("/assets/") ? heroPortrait : "/assets/img/agents/milo-hero.jpg",
    tasks: tasks.length
      ? tasks
      : [
          { icon: "check-circle", label: "Traiter les demandes" },
          { icon: "file-text", label: "Résumer l'essentiel" },
          { icon: "chat", label: "Tenir votre équipe informée" },
        ],
    action,
    integrations: integrations.length ? integrations : ["E-mail", "CRM"],
    demo: demo.length ? demo : defaultDemo(name),
    priceMonthly: isPrice(r.priceMonthly) ? Math.round(r.priceMonthly * 100) / 100 : null,
    setupFrom: isPrice(r.setupFrom) ? Math.round(r.setupFrom * 100) / 100 : null,
    createdAt,
    updatedAt,
  };
}

export function sanitizeCatalogList(raw: unknown): CatalogAgent[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CatalogAgent[] = [];
  for (const item of raw.slice(0, 100)) {
    const agent = sanitizeCatalogAgent(item);
    if (!agent || seen.has(agent.id)) continue;
    seen.add(agent.id);
    out.push(agent);
  }
  return out;
}

export async function getAgentsCatalog(): Promise<CatalogAgent[]> {
  try {
    const { data, error } = await createPublicClient()
      .from("site_settings")
      .select("value")
      .eq("key", AGENTS_CATALOG_KEY)
      .maybeSingle();
    if (error) throw error;
    return sanitizeCatalogList(data?.value);
  } catch (cause) {
    console.error("Could not load agents catalog:", cause);
    return [];
  }
}

export function catalogAgentToAgent(c: CatalogAgent): Agent {
  const priceMonthly = c.priceMonthly;
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    headline: c.headline,
    menu: c.role,
    icon: c.icon,
    category: c.category,
    portrait: c.portrait,
    heroPortrait: c.heroPortrait,
    example: c.example,
    tagline: c.example,
    description: c.description,
    tasks: c.tasks,
    action: c.action,
    features: c.tasks.map((t) => t.label),
    capabilities: c.tasks.map((t) => t.label),
    integrations: c.integrations,
    demo: c.demo,
    priceMonthly: priceMonthly ?? null,
    priceAnnual: priceMonthly != null ? Math.round(priceMonthly * 10 * 100) / 100 : null,
    setupFrom: c.setupFrom ?? null,
    creditsLabel: undefined,
    capacityLabel: undefined,
  };
}

async function withSoloPrices(list: Agent[]): Promise<Agent[]> {
  const [{ getAgentsPricing }, { AGENT_SUBSCRIPTIONS }, { getCatalogueCommercial }] = await Promise.all([
    import("@/lib/agents-pricing"),
    import("@/config/agent-subscriptions"),
    import("@/lib/catalogue-commercial"),
  ]);
  const [pricing, commercial] = await Promise.all([getAgentsPricing(), getCatalogueCommercial()]);
  return list.map((agent) => {
    const def = AGENT_SUBSCRIPTIONS[agent.id];
    if (!def) return agent;
    if (commercial[`solo:${agent.id}`]?.hidden) {
      return { ...agent, priceMonthly: null, priceAnnual: null, setupFrom: null };
    }
    const live = pricing.solo[agent.id] ?? {
      price: def.price,
      priceAnnual: def.priceAnnual,
      setupFrom: def.setupFrom,
    };
    return {
      ...agent,
      priceMonthly: live.price,
      priceAnnual: live.priceAnnual,
      setupFrom: live.setupFrom,
      creditsLabel: def.credits,
      capacityLabel: def.capacity,
    };
  });
}

/** Static + published custom agents for the public AI section. */
export async function getSiteAgents(): Promise<Agent[]> {
  const [{ getCatalogueCommercial }, catalog] = await Promise.all([
    import("@/lib/catalogue-commercial"),
    getAgentsCatalog(),
  ]);
  const commercial = await getCatalogueCommercial();
  const custom = catalog
    .filter((a) => a.published && !commercial[`agent:${a.id}`]?.hidden)
    .map(catalogAgentToAgent);
  const customIds = new Set(custom.map((a) => a.id));
  return withSoloPrices([...staticAgents.filter((a) => !customIds.has(a.id)), ...custom]);
}

export async function getSiteAgentById(id: string): Promise<Agent | null> {
  const catalog = await getAgentsCatalog();
  const custom = catalog.find((a) => a.id === id);
  if (custom) {
    if (!custom.published) return null;
    const { getCatalogueCommercial } = await import("@/lib/catalogue-commercial");
    const commercial = await getCatalogueCommercial();
    if (commercial[`agent:${custom.id}`]?.hidden) return null;
    const [priced] = await withSoloPrices([catalogAgentToAgent(custom)]);
    return priced ?? null;
  }
  const found = staticAgents.find((a) => a.id === id);
  if (!found) return null;
  const [priced] = await withSoloPrices([found]);
  return priced ?? null;
}

export function isStaticAgentId(id: string) {
  return staticAgents.some((a) => a.id === id);
}
