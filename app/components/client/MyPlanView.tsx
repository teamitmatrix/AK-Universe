import Link from "next/link";
import { ArrowRight, ArrowUpFromLine, Check, Layers, Puzzle, Users } from "lucide-react";
import type { ClientPlan } from "@/lib/client/dashboard";
import { OfferCard, PaymentFailedAlert, TermsCard } from "./cards";
import { CancelPanel, EvolveCard, OptionsCard, type OptionChoice, type PlanChoice, type PlanState } from "./PlanManager";
import { RefreshOnFocus } from "./RefreshOnFocus";
import { Swoosh } from "./Swoosh";

/** "Mon offre" (approved mockup): current plan, upgrade / change, options, usage, terms and cancellation. */
export function MyPlanView({
  plan,
  plans,
  options,
  open,
}: {
  plan: ClientPlan | null;
  plans: PlanChoice[];
  options: OptionChoice[];
  open: { evolve: "upgrade" | "modify" | null; cancel: boolean };
}) {
  const state: PlanState | null = plan && {
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
  };

  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <Swoosh className="cs-page-swoosh" id="cs-page" />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>Mon offre</h1>
        <p>Consultez les détails de votre abonnement, faites évoluer votre offre et gérez vos options.</p>
      </header>

      {plan?.status === "past_due" && <PaymentFailedAlert />}

      {!plan || !state || plan.status === "canceled" ? (
        <div className="cs-grid">
          <OfferCard plan={plan} activeLabel="Active" withCalendar />
          <section className="cs-card cs-manage" aria-labelledby="cs-evolve-title">
            <h2 id="cs-evolve-title" className="cs-card-title">
              Faire évoluer mon offre
            </h2>
            <p className="cs-card-sub">Choisissez l&apos;abonnement Agents IA adapté à votre activité.</p>
            <div className="cs-actions">
              <Link href="/abonnement" className="cs-act is-primary">
                <ArrowUpFromLine className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>Choisir mon abonnement</span>
                <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
              </Link>
              <Link href="/agents-ia#tarifs" className="cs-act">
                <Puzzle className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>Voir les offres</span>
                <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <div className="cs-grid cs-grid-plan">
          <OfferCard plan={plan} activeLabel="Active" withCalendar />
          <EvolveCard plans={plans} state={state} openInitially={open.evolve} />

          <div className="cs-row3">
            <section className="cs-card" aria-labelledby="cs-details-title">
              <h2 id="cs-details-title" className="cs-card-title is-sm">
                Détails de mon offre
              </h2>
              <p className="cs-card-sub">Tout ce qui est inclus dans votre abonnement.</p>
              <ul className="cs-checks">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                    {f}
                  </li>
                ))}
                {plan.extraUsers > 0 && (
                  <li>
                    <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                    {plan.extraUsers} utilisateur{plan.extraUsers > 1 ? "s" : ""} supplémentaire{plan.extraUsers > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            </section>

            <OptionsCard options={options} state={state} />

            <div className="cs-stack">
              <section className="cs-card" aria-labelledby="cs-usage-title">
                <h2 id="cs-usage-title" className="cs-card-title is-sm">
                  Mon usage / inclus
                </h2>
                <ul className="cs-usage">
                  <li>
                    <span className="cs-usage-icon" aria-hidden="true">
                      <Users size={18} strokeWidth={1.8} />
                    </span>
                    <span>Agents IA</span>
                    <b>{plan.agents === null ? "Illimité" : `${plan.agents} inclus`}</b>
                  </li>
                  <li>
                    <span className="cs-usage-icon" aria-hidden="true">
                      <Layers size={18} strokeWidth={1.8} />
                    </span>
                    <span>Automatisations</span>
                    <b>{plan.automations}</b>
                  </li>
                </ul>
              </section>
              <TermsCard plan={plan} withStart />
            </div>
          </div>

          {plan.manageable && <CancelPanel state={state} openInitially={open.cancel} />}
        </div>
      )}
    </main>
  );
}
