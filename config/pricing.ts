/** Agents IA subscription pricing (from abonnement.html / main.js). Amounts are EUR excl. VAT. */
export const PLAN = {
  id: "pro",
  name: "AK Universe Pro",
  monthlyPrice: 79.9,
  features: ["Agents IA illimités", "Toutes les fonctionnalités", "Support prioritaire", "Mises à jour incluses"],
};

/**
 * Offers shown on /agents-ia#tarifs (also read by the site chatbot). price/setupFrom null = on quote.
 * Also the plans a subscriber can switch between in the client space (/dashboard/mon-offre), in this order
 * (lower → higher). `id` is stored in subscriptions.plan; `agents` = AI agents included (null = unlimited / on quote).
 */
export const AGENT_TIERS = [
  {
    id: "starter",
    name: "Starter",
    agents: 1,
    automations: "Essentielles",
    desc: "Pour bien commencer avec l'IA.",
    price: 79,
    setupFrom: 390,
    features: ["1 agent IA au choix", "Tâches essentielles", "Support par email", "Idéal pour les petites entreprises"],
  },
  {
    id: "pro",
    name: "Pro",
    agents: 3,
    automations: "Avancées",
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
    id: "business",
    name: "Pro Business",
    agents: 5,
    automations: "Personnalisées",
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
    id: "devis",
    name: "Sur devis",
    agents: null,
    automations: "Sur mesure",
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

/**
 * Subscription options (client space "Options", /abonnement checkout, admin catalogue). Prices = defaults, editable
 * in the admin catalogue (site_settings "agents_pricing"). `retired` options are no longer offered (not on
 * /abonnement nor in the client space for new selection) but stay priced for the subscribers who already have
 * them, until they remove them.
 */
export const OPTIONS = [
  { id: "telephonie", label: "Téléphonie IA", icon: "phone", price: 49.9, info: "Un agent vocal intelligent pour gérer vos appels, qualifier vos demandes et répondre 24/7." },
  { id: "whatsapp", label: "WhatsApp Business", icon: "chat", price: 29, info: "Automatisez vos échanges et vos ventes sur WhatsApp." },
  { id: "marque-blanche", label: "Marque blanche", icon: "tag", price: 19, info: "Utilisez la solution à votre image (logo, nom, domaine)." },
  { id: "generateur", label: "Génération de contenu avancée", icon: "file", price: 14.9, info: "Créez automatiquement des contenus (posts, emails, fiches produits…)." },
  { id: "analyse", label: "Analyse avancée & rapports", icon: "bars", price: 19.9, info: "Suivez vos performances avec des rapports détaillés et des insights." },
  { id: "maj-premium", label: "Mises à jour premium", icon: "refresh", price: 12.9, info: "Accès anticipé aux nouvelles fonctionnalités.", retired: true },
  { id: "statut-premium", label: "Statut premium", icon: "crown-o", price: 9.9, info: "Badge premium et priorité de traitement.", retired: true },
] as const;

export const isRetiredOption = (o: (typeof OPTIONS)[number]) => "retired" in o && o.retired === true;

/** Options that can be newly chosen (checkout, client space, chatbot). */
export const OFFERED_OPTIONS = OPTIONS.filter((o) => !isRetiredOption(o));

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

/**
 * Monthly amounts after the annual discount. Optional pricing keeps existing callers working.
 * `planMonthly` overrides the base plan price (client-space plan changes: a tier price, or the price locked on the
 * subscription); by default the AK Universe Pro price sold on /abonnement.
 */
export function computeQuote(
  { cycle, users, options }: Selection,
  pricing: AgentsPricing = DEFAULT_AGENTS_PRICING,
  planMonthly?: number
) {
  const p = normalizeAgentsPricing(pricing);
  const k = cycle === "annuel" ? 1 - p.annualDiscount : 1;
  const chosen = OPTIONS.filter((o) => options.includes(o.id));
  const plan = (planMonthly ?? p.planMonthly) * k;
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
    // New subscriptions can only pick options still offered.
    options: OFFERED_OPTIONS.map((o) => o.id).filter((id) => input.options?.includes(id)),
  };
}

export const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export const toCents = (n: number) => Math.round(n * 100);
