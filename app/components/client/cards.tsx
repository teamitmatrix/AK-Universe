import Link from "next/link";
import { Calendar, Check, Info, RefreshCw } from "lucide-react";
import type { ClientPlan, SubscriptionStatus } from "@/lib/client/dashboard";
import { longDate, money } from "./format";
import { Swoosh } from "./Swoosh";

/* Cards shared by the client dashboard and "Mon offre" (same approved design). */

const STATUS: Record<SubscriptionStatus, { label: string; tone: string }> = {
  active: { label: "Actif", tone: "ok" },
  past_due: { label: "Paiement en retard", tone: "danger" },
  canceled: { label: "Résilié", tone: "muted" },
  incomplete: { label: "Paiement incomplet", tone: "warn" },
};

/**
 * Failed-payment warning. The next step is Facturation (update the card, pay the open invoice).
 * `openInvoiceId` adds the same "Régler la facture" link the billing page shows.
 */
export function PaymentFailedAlert({ openInvoiceId }: { openInvoiceId?: string | null }) {
  const payable = openInvoiceId && /^in_[A-Za-z0-9]+$/.test(openInvoiceId) ? openInvoiceId : null;
  return (
    <p className="cs-alert" role="alert">
      Votre dernier paiement n&apos;a pas abouti. <Link href="/dashboard/facturation">Mettez à jour votre moyen de paiement</Link>
      {payable ? (
        <>
          {" "}
          ou <a href={`/dashboard/facturation/facture/${payable}`} target="_blank" rel="noopener noreferrer">réglez la facture</a>
        </>
      ) : null}{" "}
      pour conserver l&apos;accès à vos agents.
    </p>
  );
}

/** Dark "Votre offre actuelle" card. `activeLabel`: "Actif" (dashboard) / "Active" (Mon offre), as in each mockup. */
export function OfferCard({ plan, activeLabel = "Actif", withCalendar = false }: { plan: ClientPlan | null; activeLabel?: string; withCalendar?: boolean }) {
  if (!plan) {
    return (
      <section className="cs-offer" aria-labelledby="cs-offer-title">
        <Swoosh className="cs-offer-swoosh" id="cs-offer" />
        <p className="cs-offer-eyebrow">Votre offre actuelle</p>
        <h2 id="cs-offer-title" className="cs-offer-name">
          Aucune offre active
        </h2>
        <p className="cs-offer-desc">Choisissez votre abonnement Agents IA pour activer vos agents et gérer votre offre depuis cet espace.</p>
      </section>
    );
  }
  const base = plan.status === "active" ? { label: activeLabel, tone: "ok" } : STATUS[plan.status];
  const status = plan.cancelAtPeriodEnd && plan.status === "active" ? { label: "Résiliation programmée", tone: "warn" } : base;
  const dateLabel = plan.status === "canceled" ? "Accès terminé" : plan.cancelAtPeriodEnd ? "Fin de l'accès" : "Prochain prélèvement";
  return (
    <section className="cs-offer" aria-labelledby="cs-offer-title">
      <Swoosh className="cs-offer-swoosh" id="cs-offer" />
      <p className="cs-offer-eyebrow">Votre offre actuelle</p>
      <div className="cs-offer-title">
        <h2 id="cs-offer-title" className="cs-offer-name notranslate">
          {plan.name}
        </h2>
        <span className={`cs-pill is-${status.tone}`}>
          {status.tone === "ok" && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
          {status.label}
        </span>
      </div>
      <p className="cs-offer-desc">{plan.features.join(" • ")}</p>
      <div className="cs-offer-foot">
        <p className="cs-offer-price notranslate">
          <strong>{money(plan.priceCents)}</strong> HT / {plan.interval === "year" ? "an" : "mois"}
        </p>
        {plan.periodEnd && (
          <p className={withCalendar ? "cs-offer-next has-icon" : "cs-offer-next"}>
            {withCalendar && <Calendar className="cs-offer-next-icon" size={24} strokeWidth={1.7} aria-hidden="true" />}
            <span>{dateLabel}</span>
            le {longDate(plan.periodEnd)}
          </p>
        )}
      </div>
    </section>
  );
}

/** "Durée et conditions". `withStart` adds the subscription start date (Mon offre). */
export function TermsCard({ plan, withStart = false }: { plan: ClientPlan; withStart?: boolean }) {
  const ended = plan.status === "canceled" || plan.cancelAtPeriodEnd;
  return (
    <section className="cs-card" aria-labelledby="cs-terms-title">
      <h2 id="cs-terms-title" className="cs-card-title is-sm">
        Durée et conditions
      </h2>
      <ul className="cs-terms">
        <li>
          <Calendar size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>
            {plan.cycle === "annuel" ? "Abonnement annuel" : "Abonnement mensuel"}
            {withStart && plan.startedAt && <small className="cs-terms-sub">Depuis le {longDate(plan.startedAt)}</small>}
          </span>
        </li>
        <li>
          <RefreshCw size={20} strokeWidth={1.8} aria-hidden="true" />
          {ended ? `Sans renouvellement${plan.periodEnd ? ` — fin le ${longDate(plan.periodEnd)}` : ""}` : "Renouvellement automatique"}
        </li>
        <li>
          <Info size={20} strokeWidth={1.8} aria-hidden="true" />
          Résiliable à tout moment
        </li>
      </ul>
    </section>
  );
}

/** Wide "Votre offre actuelle" banner of the Options page: plan, status, features and the plan price per month. */
export function OfferBanner({ plan, planMonthlyCents }: { plan: ClientPlan | null; planMonthlyCents: number | null }) {
  const status = !plan
    ? null
    : plan.cancelAtPeriodEnd && plan.status === "active"
      ? { label: "Résiliation programmée", tone: "warn" }
      : plan.status === "active"
        ? { label: "Active", tone: "ok" }
        : STATUS[plan.status];
  return (
    <section className="cs-offer cs-offer-wide" aria-labelledby="cs-offer-title">
      <Swoosh className="cs-offer-swoosh" id="cs-offer" />
      <div className="cs-offer-main">
        <p className="cs-offer-eyebrow">Votre offre actuelle</p>
        <div className="cs-offer-title">
          <h2 id="cs-offer-title" className="cs-offer-name notranslate">
            {plan ? plan.name : "Aucune offre active"}
          </h2>
          {status && (
            <span className={`cs-pill is-${status.tone}`}>
              {status.tone === "ok" && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
              {status.label}
            </span>
          )}
        </div>
        <p className="cs-offer-desc">
          {plan ? plan.features.join(" • ") : "Choisissez votre abonnement Agents IA pour ajouter des options à votre offre."}
        </p>
      </div>
      {plan && planMonthlyCents !== null && (
        <p className="cs-offer-price cs-offer-side notranslate">
          <strong>{money(planMonthlyCents)}</strong> HT / mois
        </p>
      )}
    </section>
  );
}
