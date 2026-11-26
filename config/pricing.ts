import { AGENT_ADDONS, type AddonId } from "@/config/agent-addons";
import { AGENT_SUBSCRIPTIONS, agentAnnualFromMonthly } from "@/config/agent-subscriptions";
import { agents as SITE_AGENTS } from "@/config/agents";

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
 * The client space (/client/dashboard/mon-offre) switches between these plans, lower → higher.
 * `id` is stored in subscriptions.plan; `agents` = AI agents included (null = unlimited / on quote).
 */
export const AGENT_TIERS = [
  {
    id: "starter",
    name: "Starter",
    agents: 3,
    automations: "Essentielles",
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
    id: "growth",
    name: "Growth",
    agents: 4,
    automations: "Avancées",
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
    id: "business",
    name: "Business",
    agents: 7,
    automations: "Personnalisées",
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
    id: "enterprise",
    name: "Enterprise",
    agents: 11,
    automations: "Complètes",
    desc: "8 000 crédits partagés sur les 11 agents, plus 350 minutes voix Milo. Caps indicatifs : 200 prospects, 50 tâches SEO, 50 documents juridiques et 350 minutes voix ; le reste est flexible.",
    price: 499,
    priceAnnual: 4990,
    setupFrom: 990,
    features: [
      "Les 11 agents inclus",
      "8 000 crédits / mois (partagés) + 350 min voix Milo",
      "20 utilisateurs",
      "Onboarding inclus dans la mise en place",
    ],
  },
  {
    id: "devis",
    name: "Sur devis",
    agents: null,
    automations: "Sur mesure",
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

/**
 * Subscription options (client space "Options", /abonnement checkout, admin catalogue). Prices = defaults, editable
 * in the admin catalogue (site_settings "agents_pricing"). `retired` options are no longer offered (not on
 * /abonnement nor in the client space for new selection) but stay priced for the subscribers who already have
 * them, until they remove them.
 */
export const OPTIONS = [
  { id: "telephonie", label: "Téléphonie IA", icon: "phone", price: 49.9, info: "Un agent IA répond à vos appels 24h/24." },
  { id: "whatsapp", label: "WhatsApp Business", icon: "chat", price: 29, info: "Automatisez vos échanges et vos ventes sur WhatsApp." },
  { id: "marque-blanche", label: "Marque blanche", icon: "tag", price: 19, info: "Utilisez la solution à votre image (logo, nom, domaine)." },
  { id: "maj-premium", label: "Mises à jour premium", icon: "refresh", price: 12.9, info: "Accès anticipé aux nouvelles fonctionnalités." },
  { id: "statut-premium", label: "Statut premium", icon: "crown-o", price: 9.9, info: "Badge premium et priorité de traitement." },
  { id: "generateur", label: "Générateur de contenu avancé", icon: "file", price: 14.9, info: "Modèles avancés pour textes, visuels et vidéos." },
  { id: "analyse", label: "Analyse avancée", icon: "bars", price: 19.9, info: "Tableaux de bord et rapports détaillés." },
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
  /** Pay-as-you-go packs + monthly AI add-ons (see config/agent-addons.ts). */
  addons: Record<AddonId, number>;
  /** Tier name → monthly price and set-up fee (null = on quote). */
  tiers: Record<string, { price: number | null; setupFrom: number | null }>;
  /** Per-agent solo subscription (monthly HT); annual = 10 × monthly; setupFrom = onboarding. */
  solo: Record<string, { price: number; priceAnnual: number; setupFrom: number }>;
};

export const DEFAULT_AGENTS_PRICING: AgentsPricing = {
  planMonthly: PLAN.monthlyPrice,
  userPrice: USER_PRICE,
  annualDiscount: ANNUAL_DISCOUNT,
  options: Object.fromEntries(OPTIONS.map((o) => [o.id, o.price])) as Record<OptionId, number>,
  addons: Object.fromEntries(AGENT_ADDONS.map((a) => [a.id, a.price])) as Record<AddonId, number>,
  tiers: Object.fromEntries(AGENT_TIERS.map((t) => [t.name, { price: t.price, setupFrom: t.setupFrom }])),
  solo: Object.fromEntries(
    Object.entries(AGENT_SUBSCRIPTIONS).map(([id, s]) => [
      id,
      { price: s.price, priceAnnual: s.priceAnnual, setupFrom: s.setupFrom },
    ]),
  ),
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
  if (input.addons != null && typeof input.addons === "object") {
    for (const addon of AGENT_ADDONS) {
      const v = (input.addons as Record<string, unknown>)[addon.id];
      if (isPrice(v)) base.addons[addon.id] = v;
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
  if (input.solo != null && typeof input.solo === "object") {
    for (const id of Object.keys(AGENT_SUBSCRIPTIONS)) {
      const to = (
        input.solo as Record<string, { price?: unknown; priceAnnual?: unknown; setupFrom?: unknown } | null | undefined>
      )[id];
      const cur = base.solo[id];
      if (!to || !cur) continue;
      if (isPrice(to.price)) {
        cur.price = to.price;
        cur.priceAnnual = isPrice(to.priceAnnual) ? to.priceAnnual : agentAnnualFromMonthly(to.price);
      } else if (isPrice(to.priceAnnual)) {
        cur.priceAnnual = to.priceAnnual;
      }
      if (isPrice(to.setupFrom)) cur.setupFrom = to.setupFrom;
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

export type CheckoutPlan = {
  id: string;
  name: string;
  monthly: number;
  /** Yearly package HT. Null = monthly × 12 with the annual discount. */
  annualPackage: number | null;
  setup: number;
  features: readonly string[];
};

/** A priced AI offer that can be paid on /paiement. "Sur devis" and unknown ids return null. */
export function checkoutPlan(id: string | null | undefined, pricing: AgentsPricing = DEFAULT_AGENTS_PRICING): CheckoutPlan | null {
  const rates = normalizeAgentsPricing(pricing);
  if (!id) return null;
  if (id === PLAN.id) {
    return {
      id: PLAN.id,
      name: PLAN.name,
      monthly: rates.planMonthly,
      annualPackage: null,
      setup: 0,
      features: PLAN.features,
    };
  }
  const tier = AGENT_TIERS.find((item) => item.id === id);
  if (tier) {
    if (tier.price == null) return null;
    const live = rates.tiers[tier.name];
    const monthly = live?.price ?? tier.price;
    if (monthly == null) return null;
    return {
      id: tier.id,
      name: tier.name,
      monthly,
      annualPackage: tier.priceAnnual,
      setup: live?.setupFrom ?? tier.setupFrom ?? 0,
      features: tier.features,
    };
  }
  // Solo agent (e.g. milo) — same Stripe subscription path as package tiers.
  const def = AGENT_SUBSCRIPTIONS[id];
  const live = rates.solo[id];
  if (!def && !live) return null;
  const monthly = live?.price ?? def!.price;
  const annual = live?.priceAnnual ?? def?.priceAnnual ?? agentAnnualFromMonthly(monthly);
  const setup = live?.setupFrom ?? def?.setupFrom ?? 0;
  const site = SITE_AGENTS.find((a) => a.id === id);
  const name = site?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
  const credits = def?.credits;
  const capacity = def?.capacity ?? site?.role;
  return {
    id,
    name: `Agent IA — ${name}`,
    monthly,
    annualPackage: annual,
    setup,
    features: [
      `1 agent inclus : ${name}`,
      ...(credits ? [`${credits} / mois`] : []),
      ...(capacity ? [capacity] : []),
      "Onboarding inclus dans la mise en place",
    ],
  };
}

/** What Stripe charges for a chosen plan. Setup is paid once; the rest renews. */
export function quoteCheckout(plan: CheckoutPlan, selection: Selection, pricing: AgentsPricing = DEFAULT_AGENTS_PRICING) {
  const rates = normalizeAgentsPricing(pricing);
  const annual = selection.cycle === "annuel";
  const k = annual ? 1 - rates.annualDiscount : 1;
  const chosen = OPTIONS.filter((option) => selection.options.includes(option.id));
  const usersMonthly = selection.users * rates.userPrice * k;
  const optionsMonthly = chosen.reduce((sum, option) => sum + (rates.options[option.id] ?? option.price), 0) * k;
  const planDue = annual ? (plan.annualPackage ?? plan.monthly * 12 * k) : plan.monthly;
  const extrasDue = (usersMonthly + optionsMonthly) * (annual ? 12 : 1);
  const due = planDue + extrasDue;
  const setup = Math.max(0, plan.setup);
  return {
    monthly: planDue / (annual ? 12 : 1) + usersMonthly + optionsMonthly,
    due,
    setup,
    dueToday: due + setup,
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
