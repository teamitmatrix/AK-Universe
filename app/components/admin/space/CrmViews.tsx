import Link from "next/link";
import {
  BadgePercent,
  Building2,
  CircleCheck,
  Clock,
  Euro,
  FileText,
  Hourglass,
  Info,
  Percent,
  ShoppingCart,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { localeOf, type Lang } from "@/config/languages";
import type {
  ClientFilter,
  CommissionFilter,
  LedgerFilter,
  ProspectFilter,
  QuoteFilter,
  loadClients,
  loadCommissionBoard,
  loadLedger,
  loadProspects,
  loadQuotes,
} from "@/lib/admin/crm";
import { LEDGER_PERIODS, UNASSIGNED } from "@/lib/admin/crm";
import { AdmShell } from "./AdmShell";
import { CommissionAction, FilterBar, GenerateCommissionsButton, RecordBalanceButton } from "./CrmClient";
import { dashTextFor, type DashText } from "./dashText";
import { Kpi, MigrationNote, PageHead, formatters } from "./ui";

type Admin = { name: string; email: string };
type Rep = { id: string; name: string; active: boolean };

const repField = (t: DashText, reps: Rep[], value: string, name = "commercial") => ({
  name,
  label: t.crm.filters.allReps,
  value,
  options: [
    { value: "", label: t.crm.filters.allReps },
    { value: UNASSIGNED, label: t.crm.filters.unassigned },
    ...reps.map((r) => ({ value: r.id, label: r.active ? r.name : `${r.name} (${t.team.inactive})` })),
  ],
});
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

function Definition({ text }: { text: string }) {
  return (
    <p className="adm-muted adm-small adm-definition">
      <Info size={14} aria-hidden="true" />
      {text}
    </p>
  );
}

function CardHead({ Icon, title, count }: { Icon: typeof Users; title: string; count?: string }) {
  return (
    <header className="adm-card-head">
      <h2>
        <Icon size={17} aria-hidden="true" />
        {title}
      </h2>
      {count && <span className="adm-muted adm-small">{count}</span>}
    </header>
  );
}

const STAGE_CLASS: Record<string, string> = { nouveau: "is-info", contacte: "is-info", qualifie: "is-info", devis_envoye: "is-warn", negociation: "is-warn", gagne: "is-ok", perdu: "is-muted" };
const DOC_CLASS: Record<string, string> = { brouillon: "is-muted", en_attente: "is-warn", validee: "is-ok", payee: "is-ok", annulee: "is-muted" };
const COMMISSION_CLASS: Record<string, string> = { en_attente: "is-warn", validee: "is-info", a_payer: "is-info", payee: "is-ok" };

// ---------- Clients ----------

export function ClientsView({ lang, admin, data, filter }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadClients>>; filter: ClientFilter }) {
  const t = dashTextFor(lang);
  const c = t.crm.clients;
  const f = formatters(localeOf(lang));
  return (
    <AdmShell t={t} active="clients" admin={admin}>
      <div className="adm-content">
        <PageHead title={c.title} subtitle={c.subtitle} />
        {!data.ready ? (
          <p className="adm-note">
            <Info size={15} aria-hidden="true" />
            {c.notReady}
          </p>
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={Building2} label={c.kpi.total} value={f.num(data.kpis.total)} />
              <Kpi Icon={Users} label={c.kpi.active} value={f.num(data.kpis.active)} />
              <Kpi Icon={Euro} label={c.kpi.signed} value={f.euros(data.kpis.signedCents)} />
              <Kpi Icon={Wallet} label={c.kpi.collected} value={f.euros(data.kpis.collectedCents)} />
              <Kpi Icon={Users} label={c.kpi.reps} value={f.num(data.kpis.reps)} />
            </section>
            <section className="adm-card" aria-labelledby="adm-list">
              <CardHead Icon={Building2} title={c.list} count={t.crm.results(data.rows.length)} />
              <Definition text={c.definition} />
              <FilterBar
                search={{ name: "q", value: filter.q }}
                fields={[
                  { name: "statut", label: c.status[""], value: filter.status, options: options(c.status) },
                  repField(t, data.reps, filter.commercial),
                ]}
              />
              {data.rows.length === 0 ? (
                <p className="adm-empty">{c.empty}</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">{c.cols.client}</th>
                        <th scope="col">{c.cols.commercial}</th>
                        <th scope="col" className="num">{c.cols.sales}</th>
                        <th scope="col" className="num">{c.cols.signed}</th>
                        <th scope="col" className="num">{c.cols.collected}</th>
                        <th scope="col">{c.cols.last}</th>
                        <th scope="col">{c.cols.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.id}>
                          <td data-label={c.cols.client}>
                            <span className="adm-stack">
                              <Link href={`/admin/client-detail?id=${r.id}`} className="adm-person">
                                <strong>{r.name}</strong>
                              </Link>
                              {(r.contact || r.email) && (
                                <span className="adm-person-mail">{[r.contact, r.email].filter(Boolean).join(" · ")}</span>
                              )}
                            </span>
                          </td>
                          <td data-label={c.cols.commercial}>
                            {r.commercialId ? (
                              <Link href={`/admin/commercial-detail?id=${r.commercialId}`} className="adm-person">
                                {r.commercial}
                              </Link>
                            ) : (
                              <span className="adm-muted">{t.crm.filters.unassigned}</span>
                            )}
                          </td>
                          <td data-label={c.cols.sales} className="num">{f.num(r.sales)}</td>
                          <td data-label={c.cols.signed} className="num">{f.euros(r.signedCents)}</td>
                          <td data-label={c.cols.collected} className="num">{f.euros(r.collectedCents)}</td>
                          <td data-label={c.cols.last}>{f.date(r.last)}</td>
                          <td data-label={c.cols.status}>
                            <span className={`adm-badge ${r.active ? "is-ok" : "is-muted"}`}>{r.active ? c.active : c.past}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdmShell>
  );
}

// ---------- Prospects ----------

export function ProspectsView({ lang, admin, data, filter }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadProspects>>; filter: ProspectFilter }) {
  const t = dashTextFor(lang);
  const p = t.crm.prospects;
  const f = formatters(localeOf(lang));
  return (
    <AdmShell t={t} active="prospects" admin={admin}>
      <div className="adm-content">
        <PageHead title={p.title} subtitle={p.subtitle} />
        {!data.ready ? (
          <p className="adm-note">
            <Info size={15} aria-hidden="true" />
            {p.notReady}
          </p>
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={UserPlus} label={p.kpi.total} value={f.num(data.kpis.total)} />
              <Kpi Icon={Users} label={p.kpi.open} value={f.num(data.kpis.open)} />
              <Kpi Icon={Hourglass} label={p.kpi.late} value={f.num(data.kpis.late)} />
              <Kpi Icon={Euro} label={p.kpi.pipeline} value={f.euros(data.kpis.pipelineCents)} />
              <Kpi Icon={Percent} label={p.kpi.conversion} value={f.pct(data.kpis.conversion)} />
              <Kpi Icon={Users} label={p.kpi.reps} value={f.num(data.kpis.reps)} />
            </section>
            <section className="adm-card" aria-labelledby="adm-list">
              <CardHead Icon={UserPlus} title={p.list} count={t.crm.results(data.rows.length)} />
              <Definition text={p.definition} />
              <FilterBar
                search={{ name: "q", value: filter.q }}
                fields={[
                  { name: "etape", label: p.stages[""], value: filter.stage, options: options(p.stages) },
                  repField(t, data.reps, filter.commercial),
                ]}
              />
              {data.rows.length === 0 ? (
                <p className="adm-empty">{p.empty}</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">{p.cols.prospect}</th>
                        <th scope="col">{p.cols.company}</th>
                        <th scope="col">{p.cols.commercial}</th>
                        <th scope="col">{p.cols.need}</th>
                        <th scope="col" className="num">{p.cols.budget}</th>
                        <th scope="col">{p.cols.stage}</th>
                        <th scope="col">{p.cols.followup}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.id}>
                          <td data-label={p.cols.prospect}>
                            <span className="adm-stack">
                              <Link href={`/admin/prospect-detail?id=${r.id}`} className="adm-person">
                                <strong>{r.name}</strong>
                              </Link>
                              {(r.email || r.projectReference) && (
                                <span className="adm-person-mail">
                                  {[r.email, r.projectReference ? p.fromSite(r.projectReference) : ""].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                          </td>
                          <td data-label={p.cols.company}>{r.company || p.none}</td>
                          <td data-label={p.cols.commercial}>
                            <Link href={`/admin/commercial-detail?id=${r.commercialId}`} className="adm-person">
                              {r.commercial}
                            </Link>
                          </td>
                          <td data-label={p.cols.need}>{r.need || p.none}</td>
                          <td data-label={p.cols.budget} className="num">{r.budgetCents === null ? p.none : f.euros(r.budgetCents)}</td>
                          <td data-label={p.cols.stage}>
                            <span className={`adm-badge ${STAGE_CLASS[r.stage] ?? "is-info"}`}>{p.stages[r.stage] ?? r.stage}</span>
                          </td>
                          <td data-label={p.cols.followup}>
                            {r.followupAt ? (
                              <span className={r.late ? "adm-badge is-danger" : undefined}>
                                {f.date(r.followupAt)}
                                {r.late ? ` · ${p.late}` : ""}
                              </span>
                            ) : (
                              p.none
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdmShell>
  );
}

// ---------- Sales ledger ----------

export function VentesView({ lang, admin, data, filter }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadLedger>>; filter: LedgerFilter }) {
  const t = dashTextFor(lang);
  const v = t.crm.ventes;
  const f = formatters(localeOf(lang));
  const { kpis } = data;
  const paidPct = kpis.signedCents > 0 ? Math.round((kpis.collectedCents / kpis.signedCents) * 100) : 0;
  return (
    <AdmShell t={t} active="ventes" admin={admin}>
      <div className="adm-content">
        <PageHead title={v.title} subtitle={v.subtitle} />
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={Euro} label={v.kpi.signed} value={f.euros(kpis.signedCents)} />
          <Kpi Icon={CircleCheck} label={v.kpi.collected} value={f.euros(kpis.collectedCents)} />
          <Kpi Icon={Clock} label={v.kpi.remaining} value={f.euros(kpis.remainingCents)} />
          <Kpi Icon={ShoppingCart} label={v.kpi.count} value={f.num(kpis.count)} />
        </section>

        <section className="adm-card" aria-labelledby="adm-split-title">
          <header className="adm-card-head">
            <h2 id="adm-split-title">
              <Wallet size={17} aria-hidden="true" />
              {v.split}
            </h2>
            <span className="adm-muted adm-small">{v.settledOf(kpis.settled, kpis.count)}</span>
          </header>
          <div className="adm-split-bar" role="img" aria-label={`${v.kpi.collected} ${f.euros(kpis.collectedCents)} · ${v.kpi.remaining} ${f.euros(kpis.remainingCents)}`}>
            <span className="is-paid" style={{ width: `${paidPct}%` }} />
            <span className="is-due" style={{ width: `${kpis.signedCents > 0 ? 100 - paidPct : 0}%` }} />
          </div>
          <div className="adm-legend">
            <span>
              <i className="is-paid" aria-hidden="true" />
              {v.kpi.collected} · <strong>{f.euros(kpis.collectedCents)}</strong> ({paidPct} %)
            </span>
            <span>
              <i className="is-due" aria-hidden="true" />
              {v.kpi.remaining} · <strong>{f.euros(kpis.remainingCents)}</strong> ({kpis.signedCents > 0 ? 100 - paidPct : 0} %)
            </span>
          </div>
        </section>

        <section className="adm-card" aria-labelledby="adm-list">
          <CardHead Icon={ShoppingCart} title={v.list} count={t.crm.results(data.rows.length)} />
          <FilterBar
            fields={[
              { name: "periode", label: v.periods.mois, value: filter.period === "mois" ? "" : filter.period, options: LEDGER_PERIODS.map((p) => ({ value: p === "mois" ? "" : p, label: v.periods[p]! })) },
              { name: "type", label: v.types[""], value: filter.type, options: options(v.types) },
              { name: "statut", label: v.states[""], value: filter.state, options: options(v.states) },
              ...(data.assignment ? [repField(t, data.reps, filter.commercial)] : []),
            ]}
          />
          <p className="adm-note">
            <Info size={15} aria-hidden="true" />
            {v.renewalsNote}
          </p>
          {data.rows.length === 0 ? (
            <p className="adm-empty">{v.empty}</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{v.cols.date}</th>
                    <th scope="col">{v.cols.client}</th>
                    <th scope="col">{v.cols.product}</th>
                    <th scope="col">{v.cols.commercial}</th>
                    <th scope="col" className="num">{v.cols.amount}</th>
                    <th scope="col" className="num">{v.cols.collected}</th>
                    <th scope="col" className="num">{v.cols.remaining}</th>
                    <th scope="col" className="num">{v.cols.commission}</th>
                    <th scope="col">
                      <span className="adm-sr">{v.cols.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label={v.cols.date}>{f.date(r.date)}</td>
                      <td data-label={v.cols.client}>
                        <span className="adm-stack">
                          {r.customerId ? (
                            <Link href={`/admin/client-detail?id=${r.customerId}`} className="adm-person">
                              <strong>{r.client}</strong>
                            </Link>
                          ) : (
                            <strong>{r.client}</strong>
                          )}
                          {r.documentId ? (
                            <Link href={`/admin/document?id=${r.documentId}`} className="adm-person-mail">
                              {r.reference}
                            </Link>
                          ) : (
                            <span className="adm-person-mail">{r.reference}</span>
                          )}
                        </span>
                      </td>
                      <td data-label={v.cols.product}>{r.product}</td>
                      <td data-label={v.cols.commercial}>
                        {r.commercialId ? (
                          <Link href={`/admin/commercial-detail?id=${r.commercialId}`} className="adm-person">
                            {r.commercial}
                          </Link>
                        ) : (
                          (r.commercial ?? "—")
                        )}
                      </td>
                      <td data-label={v.cols.amount} className="num">{f.euros(r.amountCents)}</td>
                      <td data-label={v.cols.collected} className="num">{f.euros(r.collectedCents)}</td>
                      <td data-label={v.cols.remaining} className="num">
                        {r.remainingCents > 0 ? <span className="adm-badge is-warn">{f.euros(r.remainingCents)}</span> : <span className="adm-badge is-ok">{v.settled}</span>}
                      </td>
                      <td data-label={v.cols.commission} className="num">{r.commissionCents === null ? "—" : f.euros(r.commissionCents)}</td>
                      <td data-label={v.cols.actions}>
                        {r.projectId && r.remainingCents > 0 && (
                          <RecordBalanceButton projectId={r.projectId} reference={r.reference} amountLabel={f.euros(r.remainingCents)} />
                        )}
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

// ---------- Quotes & invoices ----------

export function DevisFacturesView({ lang, admin, data, filter }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadQuotes>>; filter: QuoteFilter }) {
  const t = dashTextFor(lang);
  const q = t.crm.quotes;
  const f = formatters(localeOf(lang));
  return (
    <AdmShell t={t} active="devisFactures" admin={admin}>
      <div className="adm-content">
        <PageHead title={q.title} subtitle={q.subtitle} />
        {!data.ready ? (
          <p className="adm-note">
            <Info size={15} aria-hidden="true" />
            {q.notReady}
          </p>
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={FileText} label={q.kpi.quotes} value={f.num(data.kpis.quotes)} />
              <Kpi Icon={FileText} label={q.kpi.invoices} value={f.num(data.kpis.invoices)} />
              <Kpi Icon={Hourglass} label={q.kpi.open} value={f.num(data.kpis.openQuotes)} />
              <Kpi Icon={Euro} label={q.kpi.potential} value={f.euros(data.kpis.potentialCents)} />
              <Kpi Icon={Wallet} label={q.kpi.toCollect} value={f.euros(data.kpis.toCollectCents)} />
              <Kpi Icon={Percent} label={q.kpi.rate} value={f.pct(data.kpis.acceptance)} />
            </section>
            <Definition text={q.definition} />

            <section className="adm-card" aria-labelledby="adm-byrep">
              <CardHead Icon={Users} title={q.byRep} />
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">{q.cols.commercial}</th>
                      <th scope="col" className="num">{q.cols.quotes}</th>
                      <th scope="col" className="num">{q.cols.invoices}</th>
                      <th scope="col" className="num">{q.cols.accepted}</th>
                      <th scope="col" className="num">{q.cols.paid}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byRep.map((r) => (
                      <tr key={r.id ?? UNASSIGNED}>
                        <td data-label={q.cols.commercial}>
                          {r.id ? (
                            <Link href={`/admin/commercial-detail?id=${r.id}`} className="adm-person">
                              {r.name}
                            </Link>
                          ) : (
                            <span className="adm-muted">{t.crm.filters.unassigned}</span>
                          )}
                        </td>
                        <td data-label={q.cols.quotes} className="num">{f.num(r.quotes)}</td>
                        <td data-label={q.cols.invoices} className="num">{f.num(r.invoices)}</td>
                        <td data-label={q.cols.accepted} className="num">{f.num(r.accepted)}</td>
                        <td data-label={q.cols.paid} className="num">{f.num(r.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="adm-card" aria-labelledby="adm-list">
              <CardHead Icon={FileText} title={q.list} count={t.crm.results(data.rows.length)} />
              <FilterBar
                fields={[
                  { name: "statut", label: q.statuses[""], value: filter.status, options: options(q.statuses) },
                  { name: "type", label: q.types[""], value: filter.type, options: options(q.types) },
                  repField(t, data.reps, filter.commercial),
                ]}
              />
              {data.rows.length === 0 ? (
                <p className="adm-empty">{q.empty}</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">{q.qcols.reference}</th>
                        <th scope="col">{q.qcols.client}</th>
                        <th scope="col">{q.qcols.commercial}</th>
                        <th scope="col">{q.qcols.date}</th>
                        <th scope="col" className="num">{q.qcols.amount}</th>
                        <th scope="col">{q.qcols.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.id}>
                          <td data-label={q.qcols.reference}>
                            <span className="adm-stack">
                              <Link href={`/admin/document?id=${r.id}`} className="adm-person">
                                <strong>{r.number}</strong>
                              </Link>
                              <span className="adm-person-mail">{q.types[r.kind]}</span>
                            </span>
                          </td>
                          <td data-label={q.qcols.client}>
                            {r.customerId ? <Link href={`/admin/client-detail?id=${r.customerId}`}>{r.client}</Link> : r.client}
                          </td>
                          <td data-label={q.qcols.commercial}>
                            {r.commercialId ? (
                              <Link href={`/admin/commercial-detail?id=${r.commercialId}`} className="adm-person">
                                {r.commercial}
                              </Link>
                            ) : (
                              <span className="adm-muted">{t.crm.filters.unassigned}</span>
                            )}
                          </td>
                          <td data-label={q.qcols.date}>{f.date(r.date)}</td>
                          <td data-label={q.qcols.amount} className="num">{f.euros(r.amountCents)}</td>
                          <td data-label={q.qcols.status}>
                            <span className={`adm-badge ${DOC_CLASS[r.status] ?? "is-info"}`}>{q.statuses[r.status] ?? r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdmShell>
  );
}

// ---------- Commissions ----------

export function CommissionsView({
  lang,
  admin,
  data,
  filter,
}: {
  lang: Lang;
  admin: Admin;
  data: Awaited<ReturnType<typeof loadCommissionBoard>>;
  filter: CommissionFilter;
}) {
  const t = dashTextFor(lang);
  const c = t.crm.commissions;
  const f = formatters(localeOf(lang));
  return (
    <AdmShell t={t} active="commissions" admin={admin}>
      <div className="adm-content">
        <PageHead title={c.title} subtitle={c.subtitle}>
          {data.migrated && <GenerateCommissionsButton count={data.missing.ready} />}
        </PageHead>
        {!data.migrated ? (
          <MigrationNote t={t} />
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={BadgePercent} label={c.kpi.total} value={f.euros(data.kpis.totalCents)} />
              {(
                [
                  ["pending", Hourglass],
                  ["validated", CircleCheck],
                  ["toPay", Clock],
                  ["paid", Wallet],
                ] as const
              ).map(([key, Icon]) => (
                <Kpi key={key} Icon={Icon} label={c.kpi[key]} value={f.euros(data.kpis[key].cents)}>
                  <span className="adm-kpi-sub">{c.count(data.kpis[key].count)}</span>
                </Kpi>
              ))}
            </section>
            {data.missing.noRate > 0 && (
              <p className="adm-note">
                <Info size={15} aria-hidden="true" />
                {c.noRate(data.missing.noRate)}
              </p>
            )}
            <section className="adm-card" aria-labelledby="adm-list">
              <CardHead Icon={Percent} title={c.list} count={t.crm.results(data.rows.length)} />
              <FilterBar
                fields={[
                  { name: "statut", label: c.statuses[""], value: filter.status, options: options(c.statuses) },
                  repField(t, data.reps, filter.commercial),
                ]}
              />
              {data.rows.length === 0 ? (
                <p className="adm-empty">{c.empty}</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">{c.cols.date}</th>
                        <th scope="col">{c.cols.commercial}</th>
                        <th scope="col">{c.cols.sale}</th>
                        <th scope="col" className="num">{c.cols.saleAmount}</th>
                        <th scope="col" className="num">{c.cols.amount}</th>
                        <th scope="col">{c.cols.status}</th>
                        <th scope="col">{c.cols.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.id}>
                          <td data-label={c.cols.date}>{f.date(r.date)}</td>
                          <td data-label={c.cols.commercial}>
                            <Link href={`/admin/commercial-detail?id=${r.commercialId}`} className="adm-person">
                              {r.commercial}
                            </Link>
                          </td>
                          <td data-label={c.cols.sale}>
                            <span className="adm-stack">
                              <strong>{r.reference}</strong>
                              <span className="adm-person-mail">{r.client}</span>
                            </span>
                          </td>
                          <td data-label={c.cols.saleAmount} className="num">{r.saleCents === null ? "—" : f.euros(r.saleCents)}</td>
                          <td data-label={c.cols.amount} className="num">
                            <strong>{f.euros(r.amountCents)}</strong>
                          </td>
                          <td data-label={c.cols.status}>
                            <span className={`adm-badge ${COMMISSION_CLASS[r.status] ?? "is-info"}`}>{c.statuses[r.status] ?? r.status}</span>
                          </td>
                          <td data-label={c.cols.actions}>
                            {r.status === "payee" ? (
                              <span className="adm-muted adm-small">{r.paidAt ? c.paidOn(f.date(r.paidAt)) : c.statuses.payee}</span>
                            ) : (
                              <CommissionAction id={r.id} status={r.status} amountLabel={f.euros(r.amountCents)} commercial={r.commercial} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdmShell>
  );
}
