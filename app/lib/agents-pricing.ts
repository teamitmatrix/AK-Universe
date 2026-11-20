import "server-only";
import { AGENT_SUBSCRIPTIONS, agentAnnualFromMonthly } from "@/config/agent-subscriptions";
import { AGENT_TIERS, DEFAULT_AGENTS_PRICING, OPTIONS, type AgentsPricing } from "@/config/pricing";
import { createPublicClient } from "@/lib/supabase/server";

/*
 * Agents IA prices = config/pricing.ts (defaults) merged with the overrides saved from the admin catalogue
 * (site_settings "agents_pricing"). Read on the server by /abonnement, /paiement, /agents-ia#tarifs,
 * Stripe checkout and the chatbot, so one edit in the catalogue changes them everywhere.
 */

export const AGENTS_PRICING_KEY = "agents_pricing";

export type AgentsPricingOverrides = {
  planMonthly?: number;
  userPrice?: number;
  /** Percent (20 = -20 %). */
  annualDiscountPercent?: number;
  options?: Record<string, number>;
  tiers?: Record<string, { price?: number; setupFrom?: number }>;
  /** Per-agent solo monthly HT (annual derived as 10 × monthly). */
  solo?: Record<string, { price?: number; priceAnnual?: number }>;
};

const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function applyAgentsOverrides(o: AgentsPricingOverrides | null | undefined): AgentsPricing {
  const p: AgentsPricing = structuredClone(DEFAULT_AGENTS_PRICING);
  if (!o) return p;
  if (isPrice(o.planMonthly)) p.planMonthly = o.planMonthly;
  if (isPrice(o.userPrice)) p.userPrice = o.userPrice;
  if (isPrice(o.annualDiscountPercent)) p.annualDiscount = Math.min(90, o.annualDiscountPercent) / 100;
  for (const opt of OPTIONS) {
    const v = o.options?.[opt.id];
    if (isPrice(v)) p.options[opt.id] = v;
  }
  for (const tier of AGENT_TIERS) {
    const to = o.tiers?.[tier.name];
    const cur = p.tiers[tier.name];
    if (!to || !cur) continue;
    // "Sur devis" tiers stay on quote.
    if (cur.price !== null && isPrice(to.price)) cur.price = to.price;
    if (cur.setupFrom !== null && isPrice(to.setupFrom)) cur.setupFrom = to.setupFrom;
  }
  if (o.solo && typeof o.solo === "object") {
    for (const id of Object.keys(AGENT_SUBSCRIPTIONS)) {
      const to = o.solo[id];
      const cur = p.solo[id];
      if (!to || !cur) continue;
      if (isPrice(to.price)) {
        cur.price = to.price;
        cur.priceAnnual = isPrice(to.priceAnnual) ? to.priceAnnual : agentAnnualFromMonthly(to.price);
      }
    }
  }
  return p;
}

export async function getAgentsPricingOverrides(): Promise<AgentsPricingOverrides | null> {
  try {
    const { data, error } = await createPublicClient().from("site_settings").select("value").eq("key", AGENTS_PRICING_KEY).maybeSingle();
    if (error) throw error;
    return (data?.value as AgentsPricingOverrides) ?? null;
  } catch (cause) {
    // Never take checkout down because settings are unreachable: fall back to the defaults.
    console.error("Could not load Agents IA pricing overrides:", cause);
    return null;
  }
}

export async function getAgentsPricing(): Promise<AgentsPricing> {
  try {
    return applyAgentsOverrides(await getAgentsPricingOverrides());
  } catch (cause) {
    console.error("Could not build Agents IA pricing:", cause);
    return structuredClone(DEFAULT_AGENTS_PRICING);
  }
}
