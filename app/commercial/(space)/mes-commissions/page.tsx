import { CircleCheck, Clock, Euro, Receipt } from "lucide-react";
import { Kpi } from "@/components/admin/space/ui";
import { CommissionBadge, dateFr, euros, pct } from "@/components/commercial/financeUi";
import { PRODUCT_TYPE_LABELS } from "@/lib/commercial/commission-rules";
import { loadMyCommissions } from "@/lib/commercial/finance";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/mes-commissions.html (handoff pages 07 / 11): the rep's commissions by status, breakdown by product type,
 * objectives & performance, and the commission-by-commission detail. Own data only (role check + filter + RLS).
 */
export default async function MesCommissionsPage() {
  const me = await requireCommercial("/commercial/mes-commissions");
  const data = await loadMyCommissions(me);
  const max = Math.max(1, ...data.breakdown.map((b) => b.commissionCents));
  const p = data.performance;

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Mes commissions</h2>
          <p>Suivi de vos commissions par statut : en attente, validée, à payer, payée.</p>
        </div>
      </div>

      <div className="adm-kpis com-kpis">
        <Kpi Icon={Clock} label="En attente" hint="Vente enregistrée, pas encore validée par l'administrateur." value={euros(data.kpis.pending)} />
        <Kpi Icon={CircleCheck} label="Validée" hint="Confirmée, en attente de paiement." value={euros(data.kpis.validated)} />
        <Kpi Icon={Euro} label="À payer" hint="Approuvée pour le prochain versement." value={euros(data.kpis.toPay)} hero />
        <Kpi Icon={Receipt} label="Payée" hint="Versement effectué." value={euros(data.kpis.paid)} />
      </div>

      <div className="com-split">
        <section className="adm-card" aria-labelledby="com-breakdown">
          <header className="adm-card-head">
            <h2 id="com-breakdown">Répartition par type de produit</h2>
          </header>
          {data.breakdown.length === 0 ? (
            <p className="adm-empty">Aucune vente pour le moment.</p>
          ) : (
            <ul className="com-bars">
              {data.breakdown.map((b) => (
                <li key={b.type}>
                  <div>
                    <span>
                      {PRODUCT_TYPE_LABELS[b.type]} · {b.sales} vente{b.sales > 1 ? "s" : ""} · {b.rate} %
                    </span>
                    <strong>{euros(b.commissionCents)}</strong>
                  </div>
                  <span className="com-goal-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(3, Math.round((b.commissionCents / max) * 100))}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card" aria-labelledby="com-perf">
          <header className="adm-card-head">
            <h2 id="com-perf">Objectifs &amp; performance</h2>
          </header>
          <div className="com-perf">
            <div>
              <strong>{p.averageBasketCents === null ? "—" : euros(p.averageBasketCents)}</strong>
              <span>Panier moyen</span>
            </div>
            <div>
              <strong>{pct(p.conversion)}</strong>
              <span>Taux de conversion prospects</span>
            </div>
            <div>
              <strong>{p.quotesSent}</strong>
              <span>Devis envoyés</span>
            </div>
            <div>
              <strong>{p.invoicesIssued}</strong>
              <span>Factures émises</span>
            </div>
            <div>
              <strong>{p.won ?? "—"}</strong>
              <span>Ventes gagnées</span>
            </div>
            <div>
              <strong>{p.lost ?? "—"}</strong>
              <span>Ventes perdues</span>
            </div>
          </div>
        </section>
      </div>

      <section className="adm-card" aria-labelledby="com-detail">
        <header className="adm-card-head">
          <h2 id="com-detail">Détail des commissions</h2>
        </header>
        {data.rows.length === 0 ? (
          <p className="adm-empty">Aucune commission pour le moment. Une commission est créée quand une de vos factures est payée, ou par l&apos;administrateur pour une vente vidéo.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Client</th>
                  <th scope="col">Produit</th>
                  <th scope="col" className="num">Montant HT</th>
                  <th scope="col" className="num">Taux</th>
                  <th scope="col" className="num">Commission</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Date">{dateFr(r.date)}</td>
                    <td data-label="Client">
                      <span className="adm-stack">
                        <strong>{r.client}</strong>
                        <span className="adm-person-mail">{r.reference}</span>
                      </span>
                    </td>
                    <td data-label="Produit">{r.product}</td>
                    <td data-label="Montant HT" className="num">
                      {r.amountHtCents === null ? "—" : euros(r.amountHtCents)}
                    </td>
                    <td data-label="Taux" className="num">
                      {pct(r.rate)}
                    </td>
                    <td data-label="Commission" className="num">
                      {euros(r.commissionCents)}
                    </td>
                    <td data-label="Statut">
                      <CommissionBadge status={r.status} />
                      {r.paidAt && <small className="com-sub-date">le {dateFr(r.paidAt)}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
