import { Building2 } from "lucide-react";
import { euros } from "@/components/commercial/financeUi";
import { loadMyClients } from "@/lib/commercial/finance";
import { requireCommercial } from "@/lib/commercial/session";

const SOURCE_LABEL = { prospect: "Prospect converti", facture: "Facture", site: "Demande du site" } as const;

/**
 * commercial/mes-clients.html (handoff page 10): ONLY the clients this rep brought in (their converted prospects, their
 * invoices, their paid video requests) — never another rep's clients. Role check + filter on the rep's id + RLS.
 */
export default async function MesClientsPage() {
  const me = await requireCommercial("/commercial/mes-clients");
  const { clients, totals } = await loadMyClients(me);

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Mes clients</h2>
          <p>Les clients que vous avez apportés, et le chiffre d&apos;affaires généré pour chacun.</p>
        </div>
      </div>
      <p className="com-widget-sub">
        {totals.count} client{totals.count > 1 ? "s" : ""} · {euros(totals.revenueCents)} de CA généré
      </p>

      {clients.length === 0 ? (
        <p className="adm-empty">Aucun client pour le moment. Convertissez un prospect, créez un devis avec e-mail, ou attendez qu&apos;un admin vous en attribue un.</p>
      ) : (
        <ul className="com-client-grid">
          {clients.map((c) => (
            <li key={c.key} className="adm-card com-client">
              <div className="com-client-head">
                <span className="adm-avatar" aria-hidden="true">
                  <Building2 size={16} />
                </span>
                <span className="adm-stack">
                  <strong>{c.name}</strong>
                  <span className="adm-person-mail">{[c.contact, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</span>
                </span>
              </div>
              <div className="com-client-stats">
                <div>
                  <span>Ventes</span>
                  <strong>{c.sales}</strong>
                </div>
                <div>
                  <span>CA généré</span>
                  <strong className="com-gold">{euros(c.revenueCents)}</strong>
                </div>
              </div>
              <div className="com-card-tags">
                {c.sources.map((s) => (
                  <span key={s} className="adm-badge is-muted">
                    {SOURCE_LABEL[s]}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
