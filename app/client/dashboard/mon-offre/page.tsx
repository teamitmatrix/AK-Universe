import type { Metadata } from "next";
import { MyPlanView } from "@/components/client/MyPlanView";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { loadClientSubscription } from "@/lib/client/dashboard";
import { optionChoices, planCatalogue } from "@/lib/client/plans";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Mon offre — AK Universe" } };

/**
 * "Mon offre": the customer's plan, plan changes (upgrade / downgrade), options and cancellation.
 * Prices passed to the page are for display only; every change is re-priced by the server actions.
 * `?upgrade=1` / `?modifier=1` / `?resilier=1` open the matching dialog (dashboard buttons).
 */
export default async function MyPlanPage({ searchParams }: { searchParams: Promise<{ upgrade?: string; modifier?: string; resilier?: string }> }) {
  const me = await requireClient("/client/dashboard/mon-offre");
  const [params, { plan }, pricing] = await Promise.all([searchParams, loadClientSubscription(me, { history: false }), getAgentsPricing()]);

  const cycle = plan?.cycle ?? "mensuel";
  const k = cycle === "annuel" ? 1 - pricing.annualDiscount : 1;
  // Catalogue base price per month on the customer's cycle (the picker never lists their current plan).
  const plans = planCatalogue(pricing).map((p) => ({
    id: p.id,
    name: p.name,
    rank: p.rank,
    desc: p.desc,
    agents: p.agents,
    features: p.features,
    monthlyCents: p.monthlyCents === null ? null : Math.round(p.monthlyCents * k),
  }));
  const options = optionChoices(cycle, plan?.optionIds ?? [], pricing);

  return (
    <MyPlanView
      plan={plan}
      plans={plans}
      options={options}
      open={{ evolve: params.upgrade === "1" ? "upgrade" : params.modifier === "1" ? "modify" : null, cancel: params.resilier === "1" }}
    />
  );
}
