/** Agents IA subscription pricing (from abonnement.html / main.js). Amounts are EUR excl. VAT. */
export const PLAN = {
  id: "pro",
  name: "AK Universe Pro",
  monthlyPrice: 79.9,
  features: ["Agents IA illimités", "Toutes les fonctionnalités", "Support prioritaire", "Mises à jour incluses"],
};

/** Offers shown on /agents-ia#tarifs (also read by the site chatbot). price/setupFrom null = on quote. */
export const AGENT_TIERS = [
  {
    name: "Starter",
    desc: "Pour bien commencer avec l'IA.",
    price: 79,
    setupFrom: 390,
    features: ["1 agent IA au choix", "Tâches essentielles", "Support par email", "Idéal pour les petites entreprises"],
  },
  {
    name: "Pro",
    desc: "Pour accélérer votre croissance.",
    price: 139,
    setupFrom: 590,
    popular: true,
    features: [
      "Jusqu'à 3 agents IA",
      "Automatisation avancée",
      "Intégrations (CRM, outils…)",
      "Support prioritaire",
      "Rapports de performance",
    ],
  },
  {
    name: "Pro Business",
    desc: "Pour les entreprises en pleine expansion.",
    price: 249,
    setupFrom: 990,
    features: [
      "Jusqu'à 5 agents IA",
      "Solutions personnalisées",
      "Intégrations avancées",
      "Support dédié",
      "Suivi et optimisation",
      "Reporting avancé",
    ],
  },
  {
    name: "Sur devis",
    desc: "Pour les grandes équipes et projets spécifiques.",
    price: null,
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

/** Monthly amounts after the annual discount. Optional pricing keeps existing callers working. */
export function computeQuote({ cycle, users, options }: Selection, pricing: AgentsPricing = DEFAULT_AGENTS_PRICING) {
  const k = cycle === "annuel" ? 1 - pricing.annualDiscount : 1;
  const chosen = OPTIONS.filter((o) => options.includes(o.id));
  const plan = pricing.planMonthly * k;
  const usersTotal = users * pricing.userPrice * k;
  const optionsTotal = chosen.reduce((sum, o) => sum + (pricing.options[o.id] ?? o.price), 0) * k;
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
