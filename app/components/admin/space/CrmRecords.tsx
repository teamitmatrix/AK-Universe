import Link from "next/link";
import { localeOf, type Lang } from "@/config/languages";
import type { loadCustomerRecord, loadProspectRecord } from "@/lib/admin/crm";
import { AdmShell } from "./AdmShell";
import { dashTextFor } from "./dashText";
import { formatters } from "./ui";

type Admin = { name: string; email: string };
const STAGE_CLASS: Record<string, string> = { nouveau: "is-info", contacte: "is-info", qualifie: "is-info", devis_envoye: "is-warn", negociation: "is-warn", gagne: "is-ok", perdu: "is-muted" };
const DOC_CLASS: Record<string, string> = { brouillon: "is-muted", en_attente: "is-warn", validee: "is-ok", payee: "is-ok", annulee: "is-muted" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ProspectRecordView({ lang, admin, prospect }: { lang: Lang; admin: Admin; prospect: NonNullable<Awaited<ReturnType<typeof loadProspectRecord>>> }) {
  const t = dashTextFor(lang);
  const p = t.crm.prospects;
  const fiche = t.crm.fiche;
  const f = formatters(localeOf(lang));
  return (
    <AdmShell t={t} active="prospects" admin={admin}>
      <div className="adm-content">
        <nav className="adm-crumbs" aria-label="Breadcrumb">
          <Link href="/admin/prospects">{p.title}</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{prospect.name}</span>
        </nav>
        <header className="adm-pagehead">
          <div>
            <h2>{prospect.name}</h2>
            <p>
              <span className={`adm-badge ${STAGE_CLASS[prospect.stage] ?? "is-info"}`}>{p.stages[prospect.stage] ?? prospect.stage}</span>
            </p>
          </div>
        </header>
        <section className="adm-card">
          <dl className="adm-dl">
            <Row label={fiche.company}>{prospect.company || null}</Row>
            <Row label={fiche.email}>{prospect.email ? <a href={`mailto:${prospect.email}`}>{prospect.email}</a> : null}</Row>
            <Row label={fiche.phone}>{prospect.phone || null}</Row>
            <Row label={fiche.commercial}>
              <Link href={`/admin/commercial-detail?id=${prospect.commercialId}`} className="adm-person">
                {prospect.commercial}
              </Link>
            </Row>
            <Row label={fiche.source}>{prospect.source ? (fiche.sources[prospect.source] ?? prospect.source) : null}</Row>
            <Row label={fiche.need}>{prospect.need || null}</Row>
            <Row label={fiche.budget}>{prospect.budgetCents === null ? null : f.euros(prospect.budgetCents)}</Row>
            <Row label={fiche.nextAction}>{prospect.nextAction || null}</Row>
            <Row label={fiche.followup}>{prospect.followupAt ? f.date(prospect.followupAt) : null}</Row>
            <Row label={fiche.lost}>{prospect.lostReason || null}</Row>
            <Row label={fiche.notes}>{prospect.notes || null}</Row>
            <Row label={fiche.project}>{prospect.projectReference}</Row>
            <Row label={fiche.customer}>{prospect.customerId ? <Link href={`/admin/client-detail?id=${prospect.customerId}`}>{fiche.customer}</Link> : null}</Row>
            <Row label={fiche.since}>{f.date(prospect.createdAt)}</Row>
            <Row label={fiche.updated}>{f.date(prospect.updatedAt)}</Row>
          </dl>
        </section>
        <section className="adm-card">
          <header className="adm-card-head">
            <h2>{fiche.history}</h2>
          </header>
          {prospect.history.length === 0 ? (
            <p className="adm-empty">{fiche.noHistory}</p>
          ) : (
            <ul className="adm-checklist">
              {prospect.history.map((e) => (
                <li key={e.id}>
                  <span>
                    {f.date(e.at)} — {fiche.events[e.kind] ?? e.kind}
                    {e.kind === "stage" && e.fromStage && e.toStage ? ` : ${p.stages[e.fromStage] ?? e.fromStage} → ${p.stages[e.toStage] ?? e.toStage}` : ""}
                    {e.actor ? ` · ${fiche.by(e.actor)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdmShell>
  );
}

export function ClientRecordView({ lang, admin, client }: { lang: Lang; admin: Admin; client: NonNullable<Awaited<ReturnType<typeof loadCustomerRecord>>> }) {
  const t = dashTextFor(lang);
  const c = t.crm.clients;
  const fiche = t.crm.fiche;
  const q = t.crm.quotes;
  const f = formatters(localeOf(lang));
  return (
    <AdmShell t={t} active="clients" admin={admin}>
      <div className="adm-content">
        <nav className="adm-crumbs" aria-label="Breadcrumb">
          <Link href="/admin/clients">{c.title}</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{client.name}</span>
        </nav>
        <header className="adm-pagehead">
          <div>
            <h2>{client.name}</h2>
            <p>{client.contact || client.email}</p>
          </div>
        </header>
        <section className="adm-card">
          <dl className="adm-dl">
            <Row label={fiche.contact}>{client.contact || null}</Row>
            <Row label={fiche.email}>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : null}</Row>
            <Row label={fiche.phone}>{client.phone || null}</Row>
            <Row label={fiche.commercial}>
              {client.commercialId ? (
                <Link href={`/admin/commercial-detail?id=${client.commercialId}`} className="adm-person">
                  {client.commercial}
                </Link>
              ) : (
                t.crm.filters.unassigned
              )}
            </Row>
            <Row label={fiche.account}>{client.hasAccount ? fiche.accountYes : fiche.accountNo}</Row>
            <Row label={fiche.prospect}>{client.prospectId ? <Link href={`/admin/prospect-detail?id=${client.prospectId}`}>{fiche.prospect}</Link> : null}</Row>
            <Row label={fiche.since}>{f.date(client.createdAt)}</Row>
          </dl>
        </section>
        <section className="adm-card">
          <header className="adm-card-head">
            <h2>{fiche.documents}</h2>
          </header>
          {client.documents.length === 0 ? (
            <p className="adm-empty">{fiche.noDocuments}</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{q.qcols.reference}</th>
                    <th scope="col">{q.qcols.type}</th>
                    <th scope="col">{q.qcols.date}</th>
                    <th scope="col" className="num">{q.qcols.amount}</th>
                    <th scope="col">{q.qcols.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {client.documents.map((d) => (
                    <tr key={d.id}>
                      <td data-label={q.qcols.reference}>
                        <Link href={`/admin/document?id=${d.id}`}>
                          <strong>{d.number}</strong>
                        </Link>
                      </td>
                      <td data-label={q.qcols.type}>{q.types[d.kind] ?? d.kind}</td>
                      <td data-label={q.qcols.date}>{f.date(d.date)}</td>
                      <td data-label={q.qcols.amount} className="num">{f.euros(d.amountCents)}</td>
                      <td data-label={q.qcols.status}>
                        <span className={`adm-badge ${DOC_CLASS[d.status] ?? "is-info"}`}>{q.statuses[d.status] ?? d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdmShell>
  );
}
