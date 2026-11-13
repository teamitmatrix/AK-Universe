import { PRODUCT_TYPE_LABELS } from "@/lib/commercial/commission-rules";
import type { SalesDoc } from "@/lib/commercial/sales-docs";
import type { Company } from "@/lib/company";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateFr = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR");

/** The printable A4 sheet of a quote / invoice (commercial/document.html). Pure display: data checked by the page. */
export function DocumentSheet({ doc, company }: { doc: SalesDoc; company: Company }) {
  const isQuote = doc.kind === "devis";
  const vatCents = doc.totalTtcCents - doc.totalHtCents;
  const validity = new Date(new Date(`${doc.issueDate}T12:00:00`).getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  return (
    <article className="doc-sheet" aria-label={`${isQuote ? "Devis" : "Facture"} ${doc.number}`}>
      <header className="doc-head">
        <div className="doc-company">
          <p className="doc-brand notranslate" translate="no">
            <span>AK</span> UNIVERSE
          </p>
          <p>{company.legalName}</p>
          <p>{company.address}</p>
          <p>
            {company.email} · {company.phone}
          </p>
          <p>
            SIRET : {company.siret} · TVA intracom. : {company.vat}
          </p>
        </div>
        <div className="doc-title">
          <h1>{isQuote ? "DEVIS" : "FACTURE"}</h1>
          <p>
            <strong>N° :</strong> {doc.number}
          </p>
          <p>
            <strong>Date :</strong> {dateFr(doc.issueDate)}
          </p>
          {isQuote ? (
            <p>
              <strong>Valable jusqu&apos;au :</strong> {dateFr(validity)}
            </p>
          ) : (
            doc.dueDate && (
              <p>
                <strong>Échéance :</strong> {dateFr(doc.dueDate)}
              </p>
            )
          )}
          {doc.status === "brouillon" && <p className="doc-draft">BROUILLON</p>}
          {doc.status === "payee" && doc.paidAt && <p className="doc-paid">Payée le {dateFr(doc.paidAt)}</p>}
        </div>
      </header>

      <section className="doc-client">
        <h2>{isQuote ? "Devis pour" : "Facturé à"}</h2>
        <p className="doc-client-name">{doc.clientName}</p>
        {doc.clientAddress && <p>{doc.clientAddress}</p>}
        {doc.clientEmail && <p>{doc.clientEmail}</p>}
        {doc.clientSiret && <p>SIRET : {doc.clientSiret}</p>}
      </section>

      <table className="doc-lines">
        <thead>
          <tr>
            <th scope="col">Désignation</th>
            <th scope="col" className="num">
              Qté
            </th>
            <th scope="col" className="num">
              P.U. HT
            </th>
            <th scope="col" className="num">
              Total HT
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i}>
              <td>
                <strong>{l.label}</strong>
                <small>{l.detail || PRODUCT_TYPE_LABELS[l.product_type]}</small>
              </td>
              <td className="num">{Number(l.qty).toLocaleString("fr-FR")}</td>
              <td className="num">{euros(l.unit_cents)}</td>
              <td className="num">{euros(l.total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-totals">
        <p>
          <span>Total HT</span>
          <strong>{euros(doc.totalHtCents)}</strong>
        </p>
        <p>
          <span>TVA {doc.vatRate.toLocaleString("fr-FR")} %</span>
          <strong>{euros(vatCents)}</strong>
        </p>
        <p className="doc-grand">
          <span>Total TTC</span>
          <strong>{euros(doc.totalTtcCents)}</strong>
        </p>
      </div>

      {doc.notes && (
        <section className="doc-notes">
          <h2>Notes</h2>
          <p>{doc.notes}</p>
        </section>
      )}

      <footer className="doc-foot">
        {isQuote ? (
          <>
            <p>Devis valable 30 jours. Pour l&apos;accepter, retournez-le daté et signé avec la mention « Bon pour accord ».</p>
            <div className="doc-sign">
              <span>Date et signature du client :</span>
            </div>
          </>
        ) : (
          <p>
            Paiement à réception de facture{doc.dueDate ? ` et au plus tard le ${dateFr(doc.dueDate)}` : ""}. En cas de retard de paiement : pénalités au taux de 3 fois le
            taux d&apos;intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce). Pas d&apos;escompte pour paiement anticipé.
          </p>
        )}
        <p className="doc-legal">
          {company.legalName} — {company.legalForm} — RCS {company.rcs} — {company.address}
        </p>
      </footer>
    </article>
  );
}
