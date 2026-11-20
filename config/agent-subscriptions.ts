/**
 * Individual Agents IA subscriptions (cards on /agents-ia).
 * price / priceAnnual are EUR excl. VAT. Annual = 10 × monthly (2 months free).
 */
export type AgentSubscription = {
  price: number;
  priceAnnual: number;
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
  credits: string;
  capacity: string;
};

export const AGENT_SUBSCRIPTIONS: Record<string, AgentSubscription> = {
  milo: {
    price: 99,
    priceAnnual: 990,
    credits: "800 crédits voix",
    capacity: "400 minutes voix",
  },
  nora: {
    price: 39,
    priceAnnual: 390,
    credits: "1 000",
    capacity: "Jusqu'à 1 000 interactions support",
  },
  lea: {
    price: 39,
    priceAnnual: 390,
    credits: "800",
    capacity: "Jusqu'à 800 tâches d'assistant",
  },
  adam: {
    price: 69,
    priceAnnual: 690,
    credits: "1 000",
    capacity: "Jusqu'à 200 prospects recherchés",
  },
  hugo: {
    price: 39,
    priceAnnual: 390,
    credits: "800",
    capacity: "Jusqu'à 800 suivis",
  },
  jade: {
    price: 49,
    priceAnnual: 490,
    credits: "600",
    capacity: "Jusqu'à 120 posts sociaux",
  },
  sacha: {
    price: 49,
    priceAnnual: 490,
    credits: "600",
    capacity: "Jusqu'à 60 tâches SEO",
  },
  ines: {
    price: 39,
    priceAnnual: 390,
    credits: "600",
    capacity: "Jusqu'à 300 candidatures",
  },
  noe: {
    price: 39,
    priceAnnual: 390,
    credits: "800",
    capacity: "Jusqu'à 800 tâches facturation",
  },
  eva: {
    price: 29,
    priceAnnual: 290,
    credits: "600",
    capacity: "Jusqu'à 3 000 requêtes knowledge",
  },
  clara: {
    price: 59,
    priceAnnual: 590,
    credits: "500",
    capacity: "Jusqu'à 50 analyses juridiques standards",
  },
};

/** Annual package from a monthly HT price (10 months billed). */
export function agentAnnualFromMonthly(monthly: number) {
  return Math.round(monthly * 10 * 100) / 100;
}
