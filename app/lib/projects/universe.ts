import { DIGITAL_WEBSITES } from "@/config/digital";

/** Site universes used for sales tracking, commissions and Stripe metadata. */
export const PROJECT_UNIVERSES = ["agents", "marketing", "digital"] as const;
export type ProjectUniverse = (typeof PROJECT_UNIVERSES)[number];

/** Minimal cart shape (matches pricing ProjectItemInput.type). */
type CartLine = { type?: string | null };

const DIGITAL_NAMES = new Set(DIGITAL_WEBSITES.map((s) => s.name.trim().toLowerCase()));

const isAgentService = (service: string) => /^Agent IA\b/i.test(service) || /^Add-on\b/i.test(service);
const isMarketingForfait = (service: string) => /^Forfait\b/i.test(service);
const isDigitalService = (service: string) => DIGITAL_NAMES.has(service.trim().toLowerCase());

/** Detect Agents IA lines in a priced project (cart / video_projects.items). */
export function isAgentProjectItems(items: { service?: string | null }[] | null | undefined) {
  const list = items ?? [];
  if (!list.length) return false;
  return list.every((item) => isAgentService(String(item.service ?? "")));
}

/**
 * Universe from the raw cart before pricing (preferred — uses explicit line types).
 * Agent / digital / forfait take priority; plain video services → marketing.
 */
export function projectUniverseFromCart(items: CartLine[] | null | undefined): ProjectUniverse {
  const list = items ?? [];
  if (list.some((i) => i.type === "agent")) return "agents";
  if (list.some((i) => i.type === "digital")) return "digital";
  if (list.some((i) => i.type === "forfait")) return "marketing";
  return "marketing";
}

/**
 * Universe from stored priced lines (service labels). Used when reading older rows
 * or when the `universe` column is missing / null.
 */
export function projectUniverseFromItems(items: { service?: string | null }[] | null | undefined): ProjectUniverse {
  const list = (items ?? []).map((i) => String(i.service ?? "").trim()).filter(Boolean);
  if (!list.length) return "marketing";
  if (list.some(isAgentService)) return "agents";
  if (list.some(isDigitalService)) return "digital";
  if (list.some(isMarketingForfait)) return "marketing";
  return "marketing";
}

/** Prefer a stored column, else infer from priced items. */
export function resolveProjectUniverse(
  universe: string | null | undefined,
  items?: { service?: string | null }[] | null,
): ProjectUniverse {
  if (universe === "agents" || universe === "marketing" || universe === "digital") return universe;
  return projectUniverseFromItems(items);
}

export const PROJECT_UNIVERSE_LABELS: Record<ProjectUniverse, string> = {
  agents: "Agents IA",
  marketing: "Marketing",
  digital: "Digital",
};
