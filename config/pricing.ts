/** Agents IA subscription pricing (from abonnement.html / main.js). Amounts are EUR excl. VAT. */
export const PLAN = {
  id: "pro",
  name: "AK Universe Pro",
  monthlyPrice: 79.9,
  features: ["Agents IA illimités", "Toutes les fonctionnalités", "Support prioritaire", "Mises à jour incluses"],
};

/**
 * Offers shown on /agents-ia#tarifs (also read by the site chatbot + admin catalogue).
 * price / setupFrom null = on quote. priceAnnual is the billed yearly package (HT).
 */
export const AGENT_TIERS = [
  {
    name: "Starter",
    desc: "Nora : jusqu'à 500 interactions support · Léa : jusqu'à 250 tâches d'assistant · Éva : jusqu'à 1 250 requêtes knowledge.",
    price: 89,
    priceAnnual: 890,
    setupFrom: 290,
    features: [
      "Agents inclus : Nora, Léa, Éva",
      "1 000 crédits / mois (partagés)",
      "3 utilisateurs",
      "Onboarding inclus dans la mise en place",
    ],
  },
  {
    name: "Growth",
    desc: "Adam : jusqu'à 200 prospects recherchés · Hugo : jusqu'à 250 suivis · Jade : jusqu'à 50 posts sociaux · Sacha : jusqu'à 25 tâches SEO.",
    price: 169,
    priceAnnual: 1690,
    setupFrom: 490,
    popular: true,
    features: [
      "Agents inclus : Adam, Hugo, Jade, Sacha",
      "2 500 crédits / mois (partagés)",
      "5 utilisateurs",
      "Onboarding inclus dans la mise en place",
    ],
  },
  {
    name: "Business",
    desc: "Nora : 500 interactions support · Léa : 250 tâches · Adam : 150 prospects · Hugo : 200 suivis · Inès : 100 candidatures · Noé : 200 factures · Éva : 1 000 requêtes knowledge.",
    price: 249,
    priceAnnual: 2490,
    setupFrom: 690,
    features: [
      "Agents inclus : Nora, Léa, Adam, Hugo, Inès, Noé, Éva",
      "4 000 crédits / mois (partagés)",
      "10 utilisateurs",
      "Onboarding inclus dans la mise en place",
    ],
  },
  {
    name: "Enterprise",
    desc: "8 000 crédits partagés sur les 11 agents, plus 400 minutes voix Milo. Caps indicatifs : 200 prospects, 50 tâches SEO, 50 documents juridiques et 400 minutes voix ; le reste est flexible.",
    price: 499,
    priceAnnual: 4990,
    setupFrom: 990,
    features: [
      "Les 11 agents inclus",
      "8 000 crédits / mois (partagés) + 400 min voix Milo",
      "20 utilisateurs",
      "Onboarding inclus dans la mise en place",
    ],
  },
  {
    name: "Sur devis",
    desc: "Pour les grandes équipes et projets spécifiques.",
    price: null,
    priceAnnual: null,
    setupFrom: null,
    features: [
      "Agents IA illimités",
      "Solutions sur mesure",
      "Intégrations spécifiques",
      "Accompagnement dédié",
      "Formation et suivi",
      "Accès à la roadmap produit",
    ],
  },
] as const;

export const USER_PRICE = 9.9;
export const MAX_EXTRA_USERS = 500;
export const ANNUAL_DISCOUNT = 0.2;

export type Cycle = "mensuel" | "annuel";

export const OPTIONS = [
  { id: "telephonie", label: "Téléphonie IA", icon: "phone", price: 49.9, info: "Un agent IA répond à vos appels 24h/24." },
  { id: "maj-premium", label: "Mises à jour premium", icon: "refresh", price: 12.9, info: "Accès anticipé aux nouvelles fonctionnalités." },
  { id: "statut-premium", label: "Statut premium", icon: "crown-o", price: 9.9, info: "Badge premium et priorité de traitement." },
  { id: "generateur", label: "Générateur de contenu avancé", icon: "file", price: 14.9, info: "Modèles avancés pour textes, visuels et vidéos." },
  { id: "analyse", label: "Analyse avancée", icon: "bars", price: 19.9, info: "Tableaux de bord et rapports détaillés." },
] as const;

export type OptionId = (typeof OPTIONS)[number]["id"];

export type Selection = { cycle: Cycle; users: number; options: string[] };

/**
 * Editable Agents IA numbers. Defaults above; the admin catalogue saves overrides
 * in site_settings "agents_pricing", merged by lib/agents-pricing.ts.
 */
export type AgentsPricing = {
  planMonthly: number;
  userPrice: number;
  /** 0.2 = -20 % on the annual cycle. */
  annualDiscount: number;
  options: Record<OptionId, number>;
  /** Tier name → monthly price and set-up fee (null = on quote). */
  tiers: Record<string, { price: number | null; setupFrom: number | null }>;
};

export const DEFAULT_AGENTS_PRICING: AgentsPricing = {
  planMonthly: PLAN.monthlyPrice,
  userPrice: USER_PRICE,
  annualDiscount: ANNUAL_DISCOUNT,
  options: Object.fromEntries(OPTIONS.map((o) => [o.id, o.price])) as Record<OptionId, number>,
  tiers: Object.fromEntries(AGENT_TIERS.map((t) => [t.name, { price: t.price, setupFrom: t.setupFrom }])),
};

const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** Fill missing / invalid fields so UI and checkout never show NaN from a partial payload. */
export function normalizeAgentsPricing(input?: Partial<AgentsPricing> | null): AgentsPricing {
  const base = structuredClone(DEFAULT_AGENTS_PRICING);
  if (!input || typeof input !== "object") return base;
  if (isPrice(input.planMonthly)) base.planMonthly = input.planMonthly;
  if (isPrice(input.userPrice)) base.userPrice = input.userPrice;
  if (isPrice(input.annualDiscount)) base.annualDiscount = Math.min(0.9, input.annualDiscount);
  if (input.options != null && typeof input.options === "object") {
    for (const opt of OPTIONS) {
      const v = (input.options as Record<string, unknown>)[opt.id];
      if (isPrice(v)) base.options[opt.id] = v;
    }
  }
  if (input.tiers != null && typeof input.tiers === "object") {
    for (const tier of AGENT_TIERS) {
      const to = (input.tiers as Record<string, { price?: unknown; setupFrom?: unknown } | null | undefined>)[tier.name];
      const cur = base.tiers[tier.name];
      if (!to || !cur) continue;
      if (cur.price !== null && isPrice(to.price)) cur.price = to.price;
      if (cur.setupFrom !== null && isPrice(to.setupFrom)) cur.setupFrom = to.setupFrom;
    }
  }
  return base;
}

/** Monthly amounts after the annual discount. Optional pricing keeps existing callers working. */
export function computeQuote({ cycle, users, options }: Selection, pricing: AgentsPricing = DEFAULT_AGENTS_PRICING) {
  const p = normalizeAgentsPricing(pricing);
  const k = cycle === "annuel" ? 1 - p.annualDiscount : 1;
  const chosen = OPTIONS.filter((o) => options.includes(o.id));
  const plan = p.planMonthly * k;
  const usersTotal = users * p.userPrice * k;
  const optionsTotal = chosen.reduce((sum, o) => sum + (p.options[o.id] ?? o.price), 0) * k;
  const monthly = plan + usersTotal + optionsTotal;
  return {
    plan,
    usersTotal,
    optionsTotal,
    optionsCount: chosen.length,
    monthly,
    /** Charged per billing period (12 months at once on the annual cycle). */
    due: cycle === "annuel" ? monthly * 12 : monthly,
  };
}

export function sanitizeSelection(input: Partial<Selection>): Selection {
  const users = Math.floor(Number(input.users) || 0);
  return {
    cycle: input.cycle === "annuel" ? "annuel" : "mensuel",
    users: Math.min(MAX_EXTRA_USERS, Math.max(0, users)),
    options: OPTIONS.map((o) => o.id).filter((id) => input.options?.includes(id)),
  };
}

export const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export const toCents = (n: number) => Math.round(n * 100);
