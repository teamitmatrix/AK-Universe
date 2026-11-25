import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OfferBanner } from "@/components/client/cards";
import { OptionsManager } from "@/components/client/OptionsClient";
import type { PlanState } from "@/components/client/PlanManager";
import { RefreshOnFocus } from "@/components/client/RefreshOnFocus";
import { Swoosh } from "@/components/client/Swoosh";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { loadClientSubscription } from "@/lib/client/dashboard";
import { optionChoices } from "@/lib/client/plans";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Options — AK Universe" } };

/**
 * "Options": add / remove subscription options. Catalogue prices (admin-editable) are passed for display; every
 * change is re-priced, prorated and applied by the plan-change server actions after the customer confirms.
 */
export default async function OptionsPage() {
  const me = await requireClient("/client/dashboard/options");
  const [{ plan }, pricing] = await Promise.all([loadClientSubscription(me, { history: false }), getAgentsPricing()]);
  const active = plan && plan.status !== "canceled";
  const state: PlanState | null = active
    ? {
        planId: plan.planId,
        name: plan.name,
        optionIds: plan.optionIds,
        features: plan.features,
        changeable: plan.changeable,
        cancelAtPeriodEnd: plan.cancelAtPeriodEnd,
        periodEnd: plan.periodEnd,
        basis: plan.basis,
        cycle: plan.cycle,
        pending: plan.pending && { kind: plan.pending.kind, planName: plan.pending.planName, monthlyCents: plan.pending.monthlyCents, effectiveAt: plan.pending.effectiveAt },
      }
    : null;

  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <Swoosh className="cs-page-swoosh" id="cs-page" />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>Options</h1>
        <p>Complétez votre offre avec des fonctionnalités supplémentaires, selon vos besoins.</p>
      </header>

      <OfferBanner plan={active ? plan : null} planMonthlyCents={active ? Math.round(plan.baseListCents * (1 - plan.cycleDiscount)) : null} />

      {state && plan ? (
        // Remount on every server change (basis) so the draft restarts from the saved selection.
        <OptionsManager
          key={plan.basis}
          state={state}
          options={optionChoices(plan.cycle, plan.optionIds, pricing)}
          baseListCents={plan.baseListCents}
          usersListCents={plan.usersListCents}
          extraUsers={plan.extraUsers}
          cycleDiscount={plan.cycleDiscount}
        />
      ) : (
        <section className="cs-card cs-options-empty">
          <h2 className="cs-card-title is-sm">Options disponibles</h2>
          <p className="cs-card-sub">Les options s&apos;ajoutent à un abonnement Agents IA actif.</p>
          <Link href="/agents-ia#tarifs" className="cs-act is-primary cs-act-fit">
            <span>Choisir mon abonnement</span>
            <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
          </Link>
        </section>
      )}
    </main>
  );
}
