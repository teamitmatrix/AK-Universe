/**
 * Individual Agents IA subscriptions (cards on /agents-ia).
 * price / priceAnnual / setupFrom are EUR excl. VAT.
 * Annual = 12 × monthly × (1 − discount); default discount 20 %.
 * setupFrom = one-time onboarding.
 */
export type AgentSubscription = {
  price: number;
  priceAnnual: number;
  /** One-time mise en place / onboarding (HT). */
  setupFrom: number;
  /** Included credits label (French). */
  credits: string;
  /** Illustrative monthly capacity (French). */
  capacity: string;
};

/** Live solo offer used on cards and in Mon projet. */
export type AgentOffer = {
  id: string;
  name: string;
  price: number;
  priceAnnual: number;
  setupFrom: number;
  credits: string;
  capacity: string;
};

/** Default annual discount (0.2 = −20 %). Overridden by admin catalogue « Remise paiement annuel ». */
export const DEFAULT_ANNUAL_DISCOUNT = 0.2;

/**
 * Yearly package HT from a monthly price.
 * @param discount fraction in [0, 0.9] — e.g. 0.2 for −20 %
 */
export function agentAnnualFromMonthly(monthly: number, discount: number = DEFAULT_ANNUAL_DISCOUNT) {
  const d = Math.min(0.9, Math.max(0, Number.isFinite(discount) ? discount : DEFAULT_ANNUAL_DISCOUNT));
  return Math.round(monthly * 12 * (1 - d) * 100) / 100;
}

const DEFAULT_SETUP = 199;
const MILO_SETUP = 249;

export const AGENT_SUBSCRIPTIONS: Record<string, AgentSubscription> = {
  milo: {
    price: 99,
    priceAnnual: agentAnnualFromMonthly(99),
    setupFrom: MILO_SETUP,
    credits: "800 crédits voix",
    capacity: "350 minutes voix",
  },
  nora: {
    price: 39,
    priceAnnual: agentAnnualFromMonthly(39),
    setupFrom: DEFAULT_SETUP,
    credits: "1 000",
    capacity: "Jusqu'à 1 000 interactions support",
  },
  lea: {
    price: 39,
    priceAnnual: agentAnnualFromMonthly(39),
    setupFrom: DEFAULT_SETUP,
    credits: "800",
    capacity: "Jusqu'à 800 tâches d'assistant",
  },
  adam: {
    price: 69,
    priceAnnual: agentAnnualFromMonthly(69),
    setupFrom: DEFAULT_SETUP,
    credits: "1 000",
    capacity: "Jusqu'à 200 prospects recherchés",
  },
  hugo: {
    price: 39,
    priceAnnual: agentAnnualFromMonthly(39),
    setupFrom: DEFAULT_SETUP,
    credits: "800",
    capacity: "Jusqu'à 800 suivis",
  },
  jade: {
    price: 49,
    priceAnnual: agentAnnualFromMonthly(49),
    setupFrom: DEFAULT_SETUP,
    credits: "600",
    capacity: "Jusqu'à 120 posts sociaux",
  },
  sacha: {
    price: 49,
    priceAnnual: agentAnnualFromMonthly(49),
    setupFrom: DEFAULT_SETUP,
    credits: "600",
    capacity: "Jusqu'à 60 tâches SEO",
  },
  ines: {
    price: 39,
    priceAnnual: agentAnnualFromMonthly(39),
    setupFrom: DEFAULT_SETUP,
    credits: "600",
    capacity: "Jusqu'à 300 candidatures",
  },
  noe: {
    price: 39,
    priceAnnual: agentAnnualFromMonthly(39),
    setupFrom: DEFAULT_SETUP,
    credits: "800",
    capacity: "Jusqu'à 800 tâches facturation",
  },
  eva: {
    price: 29,
    priceAnnual: agentAnnualFromMonthly(29),
    setupFrom: DEFAULT_SETUP,
    credits: "600",
    capacity: "Jusqu'à 3 000 requêtes knowledge",
  },
  clara: {
    price: 59,
    priceAnnual: agentAnnualFromMonthly(59),
    setupFrom: DEFAULT_SETUP,
    credits: "500",
    capacity: "Jusqu'à 50 analyses juridiques standards",
  },
};
