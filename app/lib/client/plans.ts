import "server-only";
import { AGENT_TIERS, OPTIONS, computeQuote, isRetiredOption, toCents, type AgentsPricing, type Cycle } from "@/config/pricing";

/*
 * Plans of the client space = the Agents IA offers of /agents-ia#tarifs (config AGENT_TIERS, prices editable in
 * the admin catalogue), lower → higher. "Sur devis" has no price: it is shown with a contact link, never sold here.
 * Every amount a customer pays is computed here, on the server, with the same formula as /abonnement checkout
 * (computeQuote): base plan + extra users + options, annual discount applied.
 */

export type PlanInfo = {
  id: string;
  name: string;
  /** Position in the catalogue (higher = bigger plan). */
  rank: number;
  desc: string;
  /** Catalogue base price per month, excl. VAT (null = on quote). */
  monthlyCents: number | null;
  /** AI agents included (null = unlimited / on quote). */
  agents: number | null;
  automations: string;
  features: string[];
};

export type SubscriptionPricingRow = {
  plan: string;
  plan_price_cents?: number | null;
};

const LEGACY_PLAN = "pro";

export function planCatalogue(pricing: AgentsPricing): PlanInfo[] {
  return AGENT_TIERS.map((t, rank) => {
    const live = pricing.tiers[t.name]?.price ?? t.price;
    return {
      id: t.id,
      name: live === null ? "Offre sur devis" : `AK Universe ${t.name}`,
      rank,
      desc: t.desc,
      monthlyCents: live === null ? null : toCents(live),
      agents: t.agents,
      automations: t.automations,
      features: [...t.features],
    };
  });
}

export function planInfo(planId: string, pricing: AgentsPricing): PlanInfo {
  const found = planCatalogue(pricing).find((p) => p.id === planId);
  if (found) return found;
  // Unknown id (should not happen): readable name, ranked like Pro.
  const pro = planCatalogue(pricing).find((p) => p.id === LEGACY_PLAN)!;
  return { ...pro, id: planId, name: `AK Universe ${planId.charAt(0).toUpperCase()}${planId.slice(1)}`, monthlyCents: null };
}

/**
 * Base monthly price (cents, excl. VAT, before the annual discount) of `planId` for this subscription:
 *   - its current plan keeps the price locked on the subscription (plan_price_cents) — a catalogue change never
 *     re-prices a running subscription; subscriptions bought on /abonnement before migration 016 have none and
 *     keep the configured AK Universe Pro price they were sold at;
 *   - another plan costs its current catalogue price (null = on quote, cannot be chosen).
 */
export function basePriceCents(row: SubscriptionPricingRow, planId: string, pricing: AgentsPricing): number | null {
  if (planId === row.plan) {
    if (row.plan_price_cents != null) return row.plan_price_cents;
    if (row.plan === LEGACY_PLAN) return toCents(pricing.planMonthly);
  }
  return planInfo(planId, pricing).monthlyCents;
}

/** Monthly total and amount charged per billing period (cents, excl. VAT) for a plan + extra users + options. */
export function subscriptionTotals(
  input: { cycle: Cycle; users: number; options: string[] },
  baseCents: number,
  pricing: AgentsPricing
) {
  const quote = computeQuote(input, pricing, baseCents / 100);
  return { monthlyCents: toCents(quote.monthly), periodCents: toCents(quote.due) };
}

/** Option price per month (cents) as billed on this cycle (annual discount applied). */
export function optionMonthlyCents(optionId: string, cycle: Cycle, pricing: AgentsPricing) {
  const k = cycle === "annuel" ? 1 - pricing.annualDiscount : 1;
  const opt = OPTIONS.find((o) => o.id === optionId);
  return opt ? toCents((pricing.options[opt.id] ?? opt.price) * k) : 0;
}

/**
 * Fingerprint of the subscription state a customer reviewed. The confirm action recomputes it from the database
 * and refuses the change if it differs (a change made meanwhile, a double submission, a webhook update).
 */
export function subscriptionBasis(row: {
  plan: string;
  options: string[] | null;
  monthly_total_cents: number;
  extra_users: number;
  cycle: string;
  pending_kind?: string | null;
  cancel_at_period_end?: boolean | null;
}) {
  return [row.plan, [...(row.options ?? [])].sort().join(","), row.monthly_total_cents, row.extra_users, row.cycle, row.pending_kind ?? "", row.cancel_at_period_end ? 1 : 0].join("|");
}

/**
 * Only catalogue option ids, in catalogue order, without duplicates. A retired option is kept only if the
 * subscription already has it (`held`): it can be kept or removed, never newly added.
 */
export function sanitizeOptions(input: unknown, held: readonly string[] | null = []): string[] {
  const list = Array.isArray(input) ? input : [];
  return OPTIONS.filter((o) => !isRetiredOption(o) || (held ?? []).includes(o.id))
    .map((o) => o.id)
    .filter((id) => list.includes(id));
}

export type OptionChoice = {
  id: string;
  label: string;
  info: string;
  /** Price per month on the customer's cycle (annual discount applied), cents excl. VAT. */
  monthlyCents: number;
  /** Catalogue price per month before the cycle discount (for exact live totals). */
  listCents: number;
  retired: boolean;
};

/** Options shown to a customer: every offered option + the retired ones they still have. Display only. */
export function optionChoices(cycle: Cycle, held: readonly string[], pricing: AgentsPricing): OptionChoice[] {
  return OPTIONS.filter((o) => !isRetiredOption(o) || held.includes(o.id)).map((o) => ({
    id: o.id,
    label: o.label,
    info: o.info,
    monthlyCents: optionMonthlyCents(o.id, cycle, pricing),
    listCents: toCents(pricing.options[o.id] ?? o.price),
    retired: isRetiredOption(o),
  }));
}
