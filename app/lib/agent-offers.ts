import "server-only";
import {
  AGENT_SUBSCRIPTIONS,
  agentAnnualFromMonthly,
  type AgentOffer,
} from "@/config/agent-subscriptions";
import { agents as staticAgents } from "@/config/agents";
import { getAgentsCatalog } from "@/lib/agents-catalog";
import { getAgentsPricing } from "@/lib/agents-pricing";

export type { AgentOffer };

/** Live solo prices for static + custom agents that have a monthly fee. */
export async function getAgentOffers(): Promise<AgentOffer[]> {
  const [{ getCatalogueCommercial }, pricing, catalog] = await Promise.all([
    import("@/lib/catalogue-commercial"),
    getAgentsPricing(),
    getAgentsCatalog(),
  ]);
  const commercial = await getCatalogueCommercial();
  const offers: AgentOffer[] = [];

  for (const agent of staticAgents) {
    const def = AGENT_SUBSCRIPTIONS[agent.id];
    if (!def) continue;
    if (commercial[`solo:${agent.id}`]?.hidden) continue;
    const live = pricing.solo[agent.id] ?? {
      price: def.price,
      priceAnnual: def.priceAnnual,
      setupFrom: def.setupFrom,
    };
    offers.push({
      id: agent.id,
      name: agent.name,
      price: live.price,
      priceAnnual: live.priceAnnual,
      setupFrom: live.setupFrom,
      credits: def.credits,
      capacity: def.capacity,
    });
  }

  for (const agent of catalog) {
    if (!agent.published || agent.priceMonthly == null || agent.priceMonthly <= 0) continue;
    if (commercial[`agent:${agent.id}`]?.hidden) continue;
    if (offers.some((o) => o.id === agent.id)) continue;
    offers.push({
      id: agent.id,
      name: agent.name,
      price: agent.priceMonthly,
      priceAnnual: agentAnnualFromMonthly(agent.priceMonthly),
      setupFrom: agent.setupFrom ?? 199,
      credits: "Crédits selon offre",
      capacity: agent.role,
    });
  }

  return offers;
}

export function agentOfferOf(offers: readonly AgentOffer[] | undefined, key: string) {
  return offers?.find((o) => o.id === key) ?? null;
}
