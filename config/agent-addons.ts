/**
 * Pay-as-you-go usage packs and monthly add-ons for AI agent solo plans and packages.
 * Defaults are EUR excl. VAT; admin overrides live in site_settings "agents_pricing".addons.
 */

export type AddonBilling = "once" | "month";

export type AgentAddon = {
  id: string;
  /** French label shown on site + admin catalogue. */
  label: string;
  /** Short commercial note / scope. */
  detail: string;
  /** Default sell price HT. For ranges, this is the floor (see priceMax). */
  price: number;
  /** Optional ceiling when the commercial sheet gives a range (e.g. WhatsApp 19–29). */
  priceMax?: number;
  billing: AddonBilling;
  /**
   * Agent ids this pack is especially sold with. Omit = available on packages and every solo plan.
   * Monthly platform add-ons usually omit this; usage packs point at the matching specialists.
   */
  agents?: readonly string[];
};

export const AGENT_ADDONS = [
  {
    id: "credits-basic-1000",
    label: "1 000 crédits tâches de base",
    detail: "Nora, Léa, Hugo et Noé uniquement",
    price: 15,
    billing: "once",
    agents: ["nora", "lea", "hugo", "noe"],
  },
  {
    id: "support-1000",
    label: "1 000 interactions support supplémentaires",
    detail: "Pack d'interactions support",
    price: 19,
    billing: "once",
    agents: ["nora"],
  },
  {
    id: "prospects-100",
    label: "100 prospects recherchés supplémentaires",
    detail: "Données tierces facturées séparément",
    price: 15,
    billing: "once",
    agents: ["adam"],
  },
  {
    id: "social-100",
    label: "100 générations de contenus sociaux",
    detail: "Posts et contenus réseaux sociaux",
    price: 15,
    billing: "once",
    agents: ["jade"],
  },
  {
    id: "seo-20",
    label: "20 tâches SEO standard supplémentaires",
    detail: "Contenus SEO standard",
    price: 25,
    billing: "once",
    agents: ["sacha"],
  },
  {
    id: "docs-100",
    label: "100 pages d'analyse documentaire",
    detail: "Plafonds pages et tokens applicables",
    price: 20,
    billing: "once",
    agents: ["clara"],
  },
  {
    id: "invoices-100",
    label: "100 traitements de factures",
    detail: "Pack facturation",
    price: 12,
    billing: "once",
    agents: ["noe"],
  },
  {
    id: "recruit-100",
    label: "100 candidatures recrutement",
    detail: "Pack traitement de candidatures",
    price: 15,
    billing: "once",
    agents: ["ines"],
  },
  {
    id: "kb-queries-5000",
    label: "5 000 requêtes knowledge-base",
    detail: "Pack requêtes knowledge",
    price: 15,
    billing: "once",
    agents: ["eva"],
  },
  {
    id: "milo-voice-100",
    label: "100 minutes voix Milo",
    detail: "Minutes voix supplémentaires",
    price: 25,
    billing: "once",
    agents: ["milo"],
  },
  {
    id: "milo-voice-500",
    label: "500 minutes voix Milo",
    detail: "Minutes voix supplémentaires",
    price: 110,
    billing: "once",
    agents: ["milo"],
  },
  {
    id: "milo-voice-1000",
    label: "1 000 minutes voix Milo",
    detail: "Minutes voix supplémentaires",
    price: 200,
    billing: "once",
    agents: ["milo"],
  },
  {
    id: "users-5",
    label: "5 utilisateurs supplémentaires",
    detail: "Par mois",
    price: 10,
    billing: "month",
  },
  {
    id: "whatsapp-integration",
    label: "Intégration WhatsApp",
    detail: "Par mois · frais Meta en sus",
    price: 19,
    priceMax: 29,
    billing: "month",
  },
  {
    id: "premium-support",
    label: "Support premium",
    detail: "Par mois",
    price: 49,
    billing: "month",
  },
  {
    id: "api-access",
    label: "Accès API supplémentaire",
    detail: "Par mois",
    price: 19,
    billing: "month",
  },
] as const;

export type AddonId = (typeof AGENT_ADDONS)[number]["id"];

/** Runtime list typed with optional fields present (avoids `as const` union gaps). */
export const AGENT_ADDON_LIST: readonly AgentAddon[] = AGENT_ADDONS;

export const isAddonId = (v: unknown): v is AddonId =>
  typeof v === "string" && AGENT_ADDONS.some((a) => a.id === v);

/**
 * Add-ons offered when configuring a solo agent for the project cart
 * (same pattern as video service options): packs tagged for that agent + shared platform options.
 */
export function addonsForAgent(agentId: string): AgentAddon[] {
  return AGENT_ADDON_LIST.filter((a) => !a.agents || a.agents.includes(agentId));
}

export function formatAddonPrice(addon: AgentAddon, livePrice: number): string {
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (addon.priceMax != null && addon.priceMax > livePrice) {
    return `${fmt(livePrice)}–${fmt(addon.priceMax)} €`;
  }
  return `${fmt(livePrice)} €`;
}
