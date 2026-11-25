import Link from "next/link";
import { ArrowRight, ArrowUpFromLine, Check, CircleAlert, Download, FileText, Puzzle, SlidersVertical, type LucideIcon } from "lucide-react";
import { openClientBillingPortal } from "@/lib/billing/actions";
import type { ClientDashboard, ClientPlan, HistoryRow, HistoryStatus } from "@/lib/client/dashboard";
import { clientHref } from "@/lib/client/nav";
import type { ClientMe } from "@/lib/client/session";
import { OfferCard, PaymentFailedAlert, TermsCard } from "./cards";
import { longDate, money, monthLabel } from "./format";
import { RefreshOnFocus } from "./RefreshOnFocus";
import { Swoosh } from "./Swoosh";

const HISTORY_BADGE: Record<HistoryStatus, { label: string; tone: string }> = {
  upcoming: { label: "À venir", tone: "warn" },
  paid: { label: "Payé", tone: "ok" },
  open: { label: "À régler", tone: "warn" },
  failed: { label: "Échoué", tone: "danger" },
};

/* ---------- Building blocks ---------- */

/**
 * A dashboard action: a link to its Client space page when that page exists (CLIENT_NAV `ready`), otherwise the
 * Stripe customer portal for this customer's subscription (the existing management flow), otherwise `fallback`.
 */
function Action({
  href,
  fallback,
  portal,
  flow,
  icon: Icon,
  label,
  className,
  arrow = true,
}: {
  href: string | null;
  fallback?: string;
  portal: boolean;
  flow?: "cancel";
  icon?: LucideIcon;
  label: string;
  className: string;
  arrow?: boolean;
}) {
  const body = (
    <>
      {Icon && <Icon className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />}
      <span>{label}</span>
      {arrow && <ArrowRight className="cs-act-arrow" size={20} strokeWidth={2} aria-hidden="true" />}
    </>
  );
  const target = href ?? (portal ? null : fallback);
  if (target) {
    return (
      <Link href={target} className={className}>
        {body}
      </Link>
    );
  }
  if (!portal) return null;
  return (
    <form action={openClientBillingPortal} className="cs-act-form">
      {flow && <input type="hidden" name="flow" value={flow} />}
      <button type="submit" className={className}>
        {body}
      </button>
    </form>
  );
}

function HistoryItem({ row }: { row: HistoryRow }) {
  const badge = HISTORY_BADGE[row.status];
  const sub =
    row.status === "upcoming"
      ? `Prochain prélèvement : le ${longDate(row.date)}`
      : row.status === "paid"
        ? `Prélevé le ${longDate(row.date)}`
        : `Échéance du ${longDate(row.date)}`;
  const icon = (
    <span className="cs-doc" aria-hidden="true">
      <FileText size={20} strokeWidth={1.7} />
    </span>
  );
  return (
    <li className="cs-row">
      {row.invoiceUrl ? (
        <a href={row.invoiceUrl} target="_blank" rel="noopener noreferrer" className="cs-row-main" aria-label={`Voir la facture de ${monthLabel(row.date)}`}>
          {icon}
          <span>
            <strong>{monthLabel(row.date)}</strong>
            <small>{sub}</small>
          </span>
        </a>
      ) : (
        <div className="cs-row-main">
          {icon}
          <span>
            <strong>{monthLabel(row.date)}</strong>
            <small>{sub}</small>
          </span>
        </div>
      )}
      <span className="cs-row-amount notranslate">
        <b>{money(row.amountCents)}</b> HT
      </span>
      <span className={`cs-badge is-${badge.tone}`}>
        {row.status === "paid" && <Check size={14} strokeWidth={2.4} aria-hidden="true" />}
        {badge.label}
      </span>
    </li>
  );
}

/* ---------- Sections ---------- */

function ManageCard({ plan }: { plan: ClientPlan | null }) {
  const portal = Boolean(plan?.manageable);
  const subscribed = plan && plan.status !== "canceled";
  return (
    <section className="cs-card cs-manage" aria-labelledby="cs-manage-title">
      <h2 id="cs-manage-title" className="cs-card-title">
        Gérez votre offre
      </h2>
      {subscribed ? (
        <div className="cs-actions">
          <Action href={clientHref("offre", "upgrade=1")} portal={portal} fallback="/contact" icon={ArrowUpFromLine} label="Améliorer mon offre" className="cs-act is-primary" />
          <Action href={clientHref("options") ?? clientHref("offre")?.concat("#options") ?? null} portal={portal} fallback="/contact" icon={Puzzle} label="Ajouter des options" className="cs-act" />
          <Action href={clientHref("offre", "modifier=1")} portal={portal} fallback="/contact" icon={SlidersVertical} label="Modifier mon offre" className="cs-act" />
        </div>
      ) : (
        <div className="cs-actions">
          <Action href="/agents-ia#tarifs" portal={false} icon={ArrowUpFromLine} label="Choisir mon abonnement" className="cs-act is-primary" />
          <Action href="/agents-ia" portal={false} icon={Puzzle} label="Découvrir les agents IA" className="cs-act" />
        </div>
      )}
    </section>
  );
}

function HistoryCard({ plan, history }: { plan: ClientPlan; history: HistoryRow[] }) {
  return (
    <section className="cs-card cs-history" aria-labelledby="cs-history-title">
      <h2 id="cs-history-title" className="cs-card-title">
        {plan.interval === "year" ? "Mes échéances" : "Mes mensualités"}
      </h2>
      <p className="cs-card-sub">Historique de vos paiements et prochaines échéances.</p>
      {history.length ? (
        <ul className="cs-rows">
          {history.map((row) => (
            <HistoryItem key={row.id} row={row} />
          ))}
        </ul>
      ) : (
        <p className="cs-empty">Aucun paiement enregistré pour le moment.</p>
      )}
      <Action
        href={clientHref("facturation")}
        portal={plan.manageable}
        icon={Download}
        label="Télécharger mes factures"
        className="cs-btn-outline"
        arrow={false}
      />
    </section>
  );
}

function DetailCard({ plan }: { plan: ClientPlan }) {
  const lines = [
    ...plan.features,
    ...plan.options.map((o) => `Option : ${o.label}`),
    ...(plan.extraUsers > 0 ? [`${plan.extraUsers} utilisateur${plan.extraUsers > 1 ? "s" : ""} supplémentaire${plan.extraUsers > 1 ? "s" : ""}`] : []),
  ];
  return (
    <section className="cs-card" aria-labelledby="cs-detail-title">
      <h2 id="cs-detail-title" className="cs-card-title is-sm">
        Mon offre en détail
      </h2>
      <ul className="cs-checks">
        {lines.map((line) => (
          <li key={line}>
            <Check size={18} strokeWidth={2.2} aria-hidden="true" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CancelCard({ plan }: { plan: ClientPlan }) {
  if (!plan.manageable || plan.status === "canceled") return null;
  const end = plan.periodEnd ? longDate(plan.periodEnd) : null;
  // Confirmation (end date, reactivate) lives on "Mon offre".
  const offre = clientHref("offre");
  return (
    <section className="cs-cancel" aria-labelledby="cs-cancel-title">
      <span className="cs-cancel-icon" aria-hidden="true">
        <CircleAlert size={24} strokeWidth={1.8} />
      </span>
      <div className="cs-cancel-body">
        <h2 id="cs-cancel-title" className="cs-card-title">
          {plan.cancelAtPeriodEnd ? "Résiliation programmée" : "Résilier mon abonnement"}
        </h2>
        {plan.cancelAtPeriodEnd ? (
          <p>
            Votre abonnement ne sera pas renouvelé.
            <br />
            {end ? `Votre accès reste actif jusqu'au ${end}.` : "Votre accès reste actif jusqu'à la fin de la période en cours."}
          </p>
        ) : (
          <p>
            Vous pouvez résilier votre abonnement à tout moment.
            <br />
            Votre accès restera actif jusqu&apos;à la fin de la période en cours{end ? `, soit le ${end}` : ""}.
          </p>
        )}
      </div>
      {plan.cancelAtPeriodEnd ? (
        <Action href={offre} portal label="Gérer mon abonnement" className="cs-btn-danger" arrow={false} />
      ) : (
        <Action href={offre ? `${offre}?resilier=1` : null} portal flow="cancel" label="Résilier mon abonnement" className="cs-btn-danger" arrow={false} />
      )}
    </section>
  );
}

/* ---------- Page ---------- */

export function ClientDashboardView({ me, data, portalUnavailable }: { me: ClientMe; data: ClientDashboard; portalUnavailable: boolean }) {
  const { plan, history } = data;
  const openInvoiceId = history.find((row) => row.status === "open" && row.id.startsWith("in_"))?.id ?? null;
  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <Swoosh className="cs-page-swoosh" id="cs-page" />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>
          Bonjour {me.firstName} <span aria-hidden="true">👋</span>
        </h1>
        <p>Gérez votre abonnement, vos options et votre facturation en toute simplicité.</p>
      </header>

      {portalUnavailable && (
        <p className="cs-alert" role="alert">
          La gestion de l&apos;abonnement est momentanément indisponible. Réessayez dans un instant ou <Link href="/contact">contactez-nous</Link>.
        </p>
      )}
      {plan?.status === "past_due" && <PaymentFailedAlert openInvoiceId={openInvoiceId} />}

      <div className="cs-grid">
        <OfferCard plan={plan} />
        <ManageCard plan={plan} />
        {plan && (
          <>
            <HistoryCard plan={plan} history={history} />
            <div className="cs-stack">
              <DetailCard plan={plan} />
              <TermsCard plan={plan} />
            </div>
            <CancelCard plan={plan} />
          </>
        )}
      </div>
    </main>
  );
}
