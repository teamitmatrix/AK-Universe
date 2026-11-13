import Link from "next/link";
import {
  BadgePercent,
  Building2,
  CircleCheck,
  CircleX,
  Clock,
  Euro,
  FileText,
  Hourglass,
  Info,
  Percent,
  Receipt,
  ShoppingCart,
  UserPlus,
  UserX,
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
import { adminTextFor } from "../adminText";
import { AdmShell } from "./AdmShell";
import { CommissionAction, FilterBar, GenerateCommissionsButton, ProspectAssign, RecordBalanceButton } from "./CrmClient";
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

const STAGE_CLASS: Record<string, string> = { nouveau: "is-info", acompte_en_attente: "is-warn" };
const GROUP_CLASS: Record<string, string> = { acceptes: "is-ok", refuses: "is-muted", "en-attente": "is-warn" };
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
          {!data.assignment && <MigrationNote t={t} />}
          <FilterBar
            search={{ name: "q", value: filter.q }}
            fields={[
              { name: "statut", label: c.status[""], value: filter.status, options: options(c.status) },
              ...(data.assignment ? [repField(t, data.reps, filter.commercial)] : []),
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
                    <th scope="col">{c.cols.type}</th>
                    <th scope="col" className="num">{c.cols.sales}</th>
                    <th scope="col" className="num">{c.cols.signed}</th>
                    <th scope="col" className="num">{c.cols.collected}</th>
                    <th scope="col">{c.cols.last}</th>
                    <th scope="col">{c.cols.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.key}>
                      <td data-label={c.cols.client}>
                        <span className="adm-stack">
                          <strong>{r.name}</strong>
                          {r.email && (
                            <a href={`mailto:${r.email}`} className="adm-person-mail">
                              {r.contact !== r.name ? `${r.contact} · ` : ""}
                              {r.email}
                            </a>
                          )}
                        </span>
                      </td>
                      <td data-label={c.cols.commercial}>{r.commercial ?? <span className="adm-muted">{t.crm.filters.unassigned}</span>}</td>
                      <td data-label={c.cols.type}>{r.kinds.map((k) => c.kinds[k]).join(" + ")}</td>
                      <td data-label={c.cols.sales} className="num">{f.num(r.sales)}</td>
                      <td data-label={c.cols.signed} className="num">{f.euros(r.signedCents)}</td>
                      <td data-label={c.cols.collected} className="num">{f.euros(r.collectedCents)}</td>
                      <td data-label={c.cols.last}>{r.last ? f.date(r.last) : "—"}</td>
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
      </div>
    </AdmShell>
  );
}

// ---------- Prospects ----------

export function ProspectsView({ lang, admin, data, filter }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadProspects>>; filter: ProspectFilter }) {
  const t = dashTextFor(lang);
  const p = t.crm.prospects;
  const f = formatters(localeOf(lang));
  const repOptions = data.reps.filter((r) => r.active).map((r) => ({ value: r.id, label: r.name }));
  return (
    <AdmShell t={t} active="prospects" admin={admin}>
      <div className="adm-content">
        <PageHead title={p.title} subtitle={p.subtitle} />
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={UserPlus} label={p.kpi.total} value={f.num(data.kpis.total)} />
          <Kpi Icon={UserX} label={p.kpi.unassigned} value={data.kpis.unassigned === null ? t.unavailable : f.num(data.kpis.unassigned)} />
          <Kpi Icon={Euro} label={p.kpi.pipeline} value={f.euros(data.kpis.pipelineCents)} />
          <Kpi Icon={Percent} label={p.kpi.conversion} value={f.pct(data.kpis.conversion)} />
          <Kpi Icon={Users} label={p.kpi.reps} value={f.num(data.kpis.reps)} />
        </section>
        <section className="adm-card" aria-labelledby="adm-list">
          <CardHead Icon={UserPlus} title={p.list} count={t.crm.results(data.rows.length)} />
          <Definition text={p.definition} />
          {!data.assignment && <MigrationNote t={t} />}
          <FilterBar
            search={{ name: "q", value: filter.q }}
            fields={[
              { name: "etape", label: p.stages[""], value: filter.stage, options: options(p.stages) },
              ...(data.assignment ? [repField(t, data.reps, filter.commercial)] : []),
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
                    {data.assignment && <th scope="col">{p.cols.commercial}</th>}
                    <th scope="col">{p.cols.need}</th>
                    <th scope="col" className="num">{p.cols.budget}</th>
                    <th scope="col">{p.cols.stage}</th>
                    <th scope="col" className="num">{p.cols.age}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label={p.cols.prospect}>
                        <span className="adm-stack">
                          <strong>{r.contact}</strong>
                          <span className="adm-person-mail">
                            {r.reference} · {r.kind === "acompte" ? p.booking : p.quote}
                          </span>
                        </span>
                      </td>
                      <td data-label={p.cols.company}>{r.company || "—"}</td>
                      {data.assignment && (
                        <td data-label={p.cols.commercial}>
                          <ProspectAssign projectId={r.id} reference={r.reference} value={r.commercialId} reps={repOptions} />
                        </td>
                      )}
                      <td data-label={p.cols.need}>{r.need}</td>
                      <td data-label={p.cols.budget} className="num">{f.euros(r.budgetCents)}</td>
                      <td data-label={p.cols.stage}>
                        <span className={`adm-badge ${STAGE_CLASS[r.stage] ?? "is-info"}`}>{p.stages[r.stage] ?? r.stage}</span>
                      </td>
                      <td data-label={p.cols.age} className="num">
                        <span className={r.ageDays > 7 ? "adm-badge is-danger" : undefined}>{p.age(r.ageDays)}</span>
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
                          <strong>{r.client}</strong>
                          <span className="adm-person-mail">{r.reference}</span>
                        </span>
                      </td>
                      <td data-label={v.cols.product}>{r.product}</td>
                      <td data-label={v.cols.commercial}>{r.commercial ?? "—"}</td>
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
  const statuses = adminTextFor(lang).projects.statuses;
  return (
    <AdmShell t={t} active="devisFactures" admin={admin}>
      <div className="adm-content">
        <PageHead title={q.title} subtitle={q.subtitle} />
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={FileText} label={q.kpi.sent} value={f.num(data.kpis.sent)} />
          <Kpi Icon={CircleCheck} label={q.kpi.accepted} value={f.num(data.kpis.accepted)} />
          <Kpi Icon={CircleX} label={q.kpi.refused} value={f.num(data.kpis.refused)} />
          <Kpi Icon={Hourglass} label={q.kpi.pending} value={f.num(data.kpis.pending)} />
          <Kpi Icon={Percent} label={q.kpi.rate} value={f.pct(data.kpis.acceptance)} />
          <Kpi Icon={Receipt} label={q.kpi.invoiced} value={f.euros(data.kpis.invoicedCents)} />
        </section>
        <Definition text={q.definition} />

        {data.assignment && (
          <section className="adm-card" aria-labelledby="adm-byrep">
            <CardHead Icon={Users} title={q.byRep} />
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{q.cols.commercial}</th>
                    <th scope="col" className="num">{q.cols.sent}</th>
                    <th scope="col" className="num">{q.cols.accepted}</th>
                    <th scope="col" className="num">{q.cols.refused}</th>
                    <th scope="col">{q.cols.rate}</th>
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
                      <td data-label={q.cols.sent} className="num">{f.num(r.sent)}</td>
                      <td data-label={q.cols.accepted} className="num">{f.num(r.accepted)}</td>
                      <td data-label={q.cols.refused} className="num">{f.num(r.refused)}</td>
                      <td data-label={q.cols.rate}>
                        {r.rate === null ? (
                          "—"
                        ) : (
                          <span className="adm-progress">
                            <span className="adm-bar" aria-hidden="true">
                              <span style={{ width: `${r.rate}%` }} />
                            </span>
                            {f.pct(r.rate)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="adm-card" aria-labelledby="adm-list">
          <CardHead Icon={FileText} title={q.list} count={t.crm.results(data.quotes.length)} />
          <FilterBar
            fields={[
              { name: "statut", label: q.groups[""], value: filter.group, options: options(q.groups) },
              { name: "type", label: q.types[""], value: filter.type, options: options(q.types) },
              ...(data.assignment ? [repField(t, data.reps, filter.commercial)] : []),
            ]}
          />
          {data.quotes.length === 0 ? (
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
                  {data.quotes.map((r) => (
                    <tr key={r.id}>
                      <td data-label={q.qcols.reference}>
                        <span className="adm-stack">
                          <strong>{r.reference}</strong>
                          <span className="adm-person-mail">{q.types[r.kind]}</span>
                        </span>
                      </td>
                      <td data-label={q.qcols.client}>{r.client}</td>
                      <td data-label={q.qcols.commercial}>{r.commercial ?? "—"}</td>
                      <td data-label={q.qcols.date}>{f.date(r.date)}</td>
                      <td data-label={q.qcols.amount} className="num">{f.euros(r.amountCents)}</td>
                      <td data-label={q.qcols.status}>
                        <span className={`adm-badge ${GROUP_CLASS[r.group]}`} title={statuses[r.status]}>
                          {q.groups[r.group]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card" aria-labelledby="adm-invoices">
          <CardHead Icon={Receipt} title={q.invoices} count={t.crm.results(data.invoices.length)} />
          {data.invoices.length === 0 ? (
            <p className="adm-empty">{q.noInvoices}</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{q.icols.date}</th>
                    <th scope="col">{q.icols.type}</th>
                    <th scope="col">{q.icols.reference}</th>
                    <th scope="col">{q.icols.client}</th>
                    <th scope="col" className="num">{q.icols.amount}</th>
                    <th scope="col">{q.icols.stripe}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((r) => (
                    <tr key={r.id}>
                      <td data-label={q.icols.date}>{f.date(r.date)}</td>
                      <td data-label={q.icols.type}>
                        <span className="adm-badge is-ok">{q.kinds[r.kind] ?? r.kind}</span>
                      </td>
                      <td data-label={q.icols.reference}>{r.reference}</td>
                      <td data-label={q.icols.client}>{r.client}</td>
                      <td data-label={q.icols.amount} className="num">{f.euros(r.amountCents)}</td>
                      <td data-label={q.icols.stripe}>
                        <code className="adm-code">{r.stripeId ?? "—"}</code>
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
