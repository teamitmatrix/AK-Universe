import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, CreditCard, Download, Eye, FileText, Layers } from "lucide-react";
import { openClientPaymentMethodPortal } from "@/lib/billing/actions";
import type { ClientBilling, InvoiceRow, InvoiceStatus } from "@/lib/client/billing";
import type { ClientPlan } from "@/lib/client/dashboard";
import { BillingInfoCard, CycleSwitch } from "./BillingClient";
import { CancelPanel, type PlanState } from "./PlanManager";
import { longDate, money, monthLabel, shortDate } from "./format";
import { RefreshOnFocus } from "./RefreshOnFocus";
import { Swoosh } from "./Swoosh";

/** "Facturation" (approved mockup): next payment, amount, payment method, invoices, documents, billing details. */

const STATUS: Record<InvoiceStatus, { label: string; tone: string }> = {
  upcoming: { label: "À venir", tone: "warn" },
  paid: { label: "Payée", tone: "ok" },
  open: { label: "À régler", tone: "warn" },
  uncollectible: { label: "Impayée", tone: "danger" },
};

const invoiceHref = (id: string, pdf = false) => `/client/dashboard/facturation/facture/${id}${pdf ? "?format=pdf" : ""}`;

/** Same shape as "Mon offre", so Facturation can cancel or resume with the existing confirmation. */
function cancelState(plan: ClientPlan): PlanState {
  return {
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
}

function periodLabel(row: InvoiceRow) {
  if (!row.periodStart) return "—";
  const long = row.periodEnd && new Date(row.periodEnd).getTime() - new Date(row.periodStart).getTime() > 40 * 86_400_000;
  return long ? `${monthLabel(row.periodStart)} – ${monthLabel(row.periodEnd!)}` : monthLabel(row.periodStart);
}

function InvoiceLine({ row }: { row: InvoiceRow }) {
  const badge = STATUS[row.status];
  const title = row.number ?? (row.status === "upcoming" ? "Prochaine facture" : "Facture");
  return (
    <tr>
      <td data-label="Facture">
        <span className="cs-inv-num">
          <span className="cs-doc" aria-hidden="true">
            <FileText size={18} strokeWidth={1.7} />
          </span>
          <span>
            <strong className="notranslate">{title}</strong>
            <small>{row.status === "upcoming" ? `Prévue le ${shortDate(row.date)}` : `Émise le ${shortDate(row.date)}`}</small>
          </span>
        </span>
      </td>
      <td data-label="Période" className="cs-nowrap">
        {periodLabel(row)}
      </td>
      <td data-label="Montant (HT)" className="cs-inv-amount notranslate">
        {money(row.amountCents)}
      </td>
      <td data-label="Statut">
        <span className={`cs-badge is-${badge.tone}`}>{badge.label}</span>
      </td>
      <td data-label="Actions">
        <span className="cs-inv-actions">
          {row.id ? (
            <>
              <a href={invoiceHref(row.id)} target="_blank" rel="noopener noreferrer" className="cs-icon-btn" aria-label={`Voir la facture ${title}`} title={row.status === "open" ? "Voir et régler" : "Voir"}>
                <Eye size={18} aria-hidden="true" />
              </a>
              {row.hasPdf ? (
                <a href={invoiceHref(row.id, true)} className="cs-icon-btn" aria-label={`Télécharger la facture ${title} (PDF)`} title="Télécharger (PDF)">
                  <Download size={18} aria-hidden="true" />
                </a>
              ) : (
                <span className="cs-icon-btn is-disabled" aria-hidden="true">
                  <Download size={18} />
                </span>
              )}
            </>
          ) : (
            <>
              <span className="cs-icon-btn is-disabled" title="Disponible une fois la facture émise" aria-label="Aperçu disponible une fois la facture émise" role="img">
                <Eye size={18} aria-hidden="true" />
              </span>
              <span className="cs-icon-btn is-disabled" title="Disponible une fois la facture émise" aria-hidden="true">
                <Download size={18} />
              </span>
            </>
          )}
        </span>
      </td>
    </tr>
  );
}

export function BillingView({
  data,
  countries,
  countryName,
  discountLabel,
  portalUnavailable,
  before,
}: {
  data: ClientBilling;
  countries: { code: string; label: string }[];
  countryName: string;
  discountLabel: string | null;
  portalUnavailable: boolean;
  before: string | null;
}) {
  const { plan, invoices, paymentMethod } = data;
  const renews = plan && plan.status !== "canceled" && !plan.cancelAtPeriodEnd;
  const latest = invoices.find((i) => i.id && i.hasPdf);
  const cycleLocked = !plan
    ? "Aucun abonnement"
    : plan.cancelAtPeriodEnd
      ? "Réactivez votre abonnement pour changer de cycle."
      : plan.pending
        ? "Un changement est déjà en cours sur votre abonnement."
        : !plan.changeable
          ? "Changement de cycle momentanément indisponible."
          : null;

  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <Swoosh className="cs-page-swoosh" id="cs-page" />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>Facturation</h1>
        <p>Consultez vos factures, suivez vos paiements et gérez votre moyen de paiement.</p>
      </header>

      {portalUnavailable && (
        <p className="cs-alert" role="alert">
          La gestion du moyen de paiement est momentanément indisponible. Réessayez dans un instant ou <Link href="/contact">contactez-nous</Link>.
        </p>
      )}
      {(plan?.status === "past_due" || data.openInvoiceId) && (
        <p className="cs-alert" role="alert">
          Un paiement est en attente.{" "}
          {data.openInvoiceId ? (
            <a href={invoiceHref(data.openInvoiceId)} target="_blank" rel="noopener noreferrer">
              Régler la facture
            </a>
          ) : (
            "Mettez à jour votre moyen de paiement pour conserver l'accès à vos agents."
          )}
        </p>
      )}

      <div className="cs-kpis">
        <section className="cs-kpi is-dark" aria-label="Prochain prélèvement">
          <Swoosh className="cs-kpi-swoosh" id="cs-kpi" />
          <span className="cs-kpi-icon" aria-hidden="true">
            <Calendar size={26} strokeWidth={1.7} />
          </span>
          <div>
            <p>{renews ? "Prochain prélèvement" : plan?.periodEnd ? "Fin de l'accès" : "Prochain prélèvement"}</p>
            <strong>{plan?.periodEnd ? longDate(plan.periodEnd) : "Aucun prélèvement prévu"}</strong>
            {renews && plan?.nextAmountCents != null && plan.nextAmountCents !== plan.priceCents && (
              <small className="notranslate">{money(plan.nextAmountCents)} HT</small>
            )}
          </div>
        </section>

        <section className="cs-kpi" aria-label="Montant">
          <span className="cs-kpi-icon is-soft" aria-hidden="true">
            <Layers size={26} strokeWidth={1.7} />
          </span>
          <div>
            <p>Montant</p>
            {plan ? (
              <>
                <strong className="notranslate">
                  {money(plan.priceCents)} <span>HT / {plan.interval === "year" ? "an" : "mois"}</span>
                </strong>
                <CycleSwitch cycle={plan.cycle} discountLabel={discountLabel} disabledReason={cycleLocked} />
              </>
            ) : (
              <>
                <strong>—</strong>
                <p className="cs-kpi-sub">
                  <Link href="/" className="cs-link-btn">
                    Choisir mon abonnement
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>

        <section className="cs-kpi" aria-label="Moyen de paiement">
          <span className="cs-kpi-icon is-soft" aria-hidden="true">
            <CreditCard size={26} strokeWidth={1.7} />
          </span>
          <div>
            <p>Moyen de paiement</p>
            <strong className="cs-kpi-pm notranslate">{paymentMethod?.label ?? "Aucun"}</strong>
            {paymentMethod?.detail && <p className="cs-kpi-sub">{paymentMethod.detail}</p>}
          </div>
          {data.stripeCustomer && (
            <form action={openClientPaymentMethodPortal} className="cs-kpi-action">
              <button type="submit" className="cs-btn-outline">
                {paymentMethod ? "Modifier" : "Ajouter"}
              </button>
            </form>
          )}
        </section>
      </div>

      <div className="cs-grid cs-grid-billing">
        <section className="cs-card cs-invoices" aria-labelledby="cs-inv-title">
          <h2 id="cs-inv-title" className="cs-card-title">
            Historique des factures
          </h2>
          <p className="cs-card-sub">Toutes vos factures et leur statut de paiement.</p>
          {invoices.length ? (
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th scope="col">Facture</th>
                    <th scope="col">Période</th>
                    <th scope="col">Montant (HT)</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((row) => (
                    <InvoiceLine key={row.id ?? "upcoming"} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="cs-empty">{data.live || !data.stripeCustomer ? "Aucune facture pour le moment." : "Vos factures sont momentanément indisponibles. Réessayez dans un instant."}</p>
          )}
          {(before || data.hasMore) && (
            <nav className="cs-pager" aria-label="Pages de factures">
              {before ? (
                <Link href="/client/dashboard/facturation" className="cs-link-btn">
                  <ArrowLeft size={16} aria-hidden="true" /> Factures récentes
                </Link>
              ) : (
                <span />
              )}
              {data.hasMore && invoices.at(-1)?.id && (
                <Link href={`/client/dashboard/facturation?avant=${invoices.at(-1)!.id}`} className="cs-link-btn">
                  Factures plus anciennes <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </section>

        <div className="cs-stack">
          <section className="cs-card" aria-labelledby="cs-docs-title">
            <h2 id="cs-docs-title" className="cs-card-title is-sm">
              Télécharger mes documents
            </h2>
            <p className="cs-card-sub">Retrouvez les documents liés à votre abonnement.</p>
            <div className="cs-actions cs-docs">
              {latest?.id ? (
                <a href={invoiceHref(latest.id, true)} className="cs-act">
                  <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    Dernière facture
                    <small className="notranslate">
                      {[latest.number, latest.periodStart ? monthLabel(latest.periodStart) : null].filter(Boolean).join(" • ")}
                    </small>
                  </span>
                  <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
                </a>
              ) : (
                <span className="cs-act is-disabled" aria-disabled="true">
                  <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    Dernière facture
                    <small>Aucune facture émise</small>
                  </span>
                </span>
              )}
              <Link href="/client/dashboard/accords" className="cs-act">
                <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  Conditions et confidentialité
                  <small>Versions acceptées, date et heure</small>
                </span>
                <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
              </Link>
              {plan ? (
                <Link href="/client/dashboard/facturation/contrat" className="cs-act">
                  <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    Contrat d&apos;abonnement
                    <small>Version actuelle</small>
                  </span>
                  <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
                </Link>
              ) : (
                <span className="cs-act is-disabled" aria-disabled="true">
                  <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    Contrat d&apos;abonnement
                    <small>Disponible après souscription</small>
                  </span>
                </span>
              )}
            </div>
          </section>
          <BillingInfoCard profile={data.profile} countries={countries} countryName={countryName} ready={data.profileReady} />
        </div>
        {plan && plan.status !== "canceled" && plan.manageable && <CancelPanel state={cancelState(plan)} openInitially={false} />}
      </div>
    </main>
  );
}
