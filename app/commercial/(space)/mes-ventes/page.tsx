import { Info } from "lucide-react";
import { MonthSelect } from "@/components/commercial/MonthSelect";
import { CommissionBadge, dateFr, euros, pct } from "@/components/commercial/financeUi";
import { loadLedger } from "@/lib/commercial/finance";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/mes-ventes.html (handoff page 10): ONLY the signed-in rep's own sales, with the commission per line.
 * requireCommercial() checks the role here; loadLedger is filtered on the rep's id and runs with their session (RLS).
 */
export default async function MesVentesPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const me = await requireCommercial("/commercial/mes-ventes");
  const data = await loadLedger(me, (await searchParams).mois);

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Mes ventes</h2>
          <p>Liste de vos ventes. Vous ne voyez que vos propres ventes.</p>
        </div>
      </div>

      <div className="com-board-bar">
        <div className="com-month-row">
          <MonthSelect value={data.month} months={data.months} />
          <p className="com-widget-sub">
            {data.totals.count} vente{data.totals.count > 1 ? "s" : ""} · {euros(data.totals.amountHtCents)} de CA · {euros(data.totals.commissionCents)} de commission
          </p>
        </div>
      </div>
      {!data.docsReady && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Les factures émises depuis « Devis &amp; factures » apparaîtront ici après l&apos;application de la migration 012.
        </p>
      )}

      <section className="adm-card">
        {data.rows.length === 0 ? (
          <p className="adm-empty">Aucune vente ce mois-ci.</p>
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
                  <tr key={r.key}>
                    <td data-label="Date">{dateFr(r.date)}</td>
                    <td data-label="Client">
                      <span className="adm-stack">
                        <strong>{r.client}</strong>
                        <span className="adm-person-mail">
                          {r.reference} · {r.source === "facture" ? "Facture" : "Demande vidéo du site"}
                        </span>
                      </span>
                    </td>
                    <td data-label="Produit">{r.product}</td>
                    <td data-label="Montant HT" className="num">
                      {euros(r.amountHtCents)}
                    </td>
                    <td data-label="Taux" className="num">
                      {pct(r.rate)}
                    </td>
                    <td data-label="Commission" className="num">
                      {r.commissionCents === null ? "—" : euros(r.commissionCents)}
                    </td>
                    <td data-label="Statut">
                      <CommissionBadge status={r.commissionStatus} source={r.source} invoicePaid={r.invoicePaid} />
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
