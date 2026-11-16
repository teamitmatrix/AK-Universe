import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CircleCheck,
  Euro,
  FileText,
  Film,
  FolderOpen,
  Info,
  KeyRound,
  ListChecks,
  Percent,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Tags,
  Ticket,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { localeOf, type Lang } from "@/config/languages";
import { COMPANY } from "@/config/company";
import type { loadAgenda, AgendaFilter } from "@/lib/admin/agenda";
import type { loadCatalogue } from "@/lib/admin/catalogue";
import type { loadDocuments } from "@/lib/admin/documents";
import type { loadPromotions } from "@/lib/admin/promotions";
import type { loadReports, ReportPeriod } from "@/lib/admin/reports";
import { REPORT_PERIODS } from "@/lib/admin/reports";
import type { loadSettings } from "@/lib/admin/settings";
import { AdmShell } from "./AdmShell";
import { FilterBar } from "./CrmClient";
import { dashTextFor } from "./dashText";
import { RevenueChart } from "./RevenueChart";
import { AddStaffButton, StaffOpenLink } from "./StaffManage";
import { CatalogueEditor, CommissionRatesForm, CompanyForm, FileActions, LibraryGrid, NewPromotionButton, NewTaskButton, NotificationsForm, PasswordForm, ProfileForm, PromotionToggle, TaskActions, UploadButton, type TaskOptions } from "./ToolsClient";
import type { loadCommissionRates } from "@/lib/admin/rates";
import { toolsTextFor } from "./toolsText";
import { Kpi, PageHead, formatters } from "./ui";

type Admin = { name: string; email: string };

function CardHead({ Icon, title, children }: { Icon: typeof Tags; title: string; children?: React.ReactNode }) {
  return (
    <header className="adm-card-head">
      <h2>
        <Icon size={17} aria-hidden="true" />
        {title}
      </h2>
      {children}
    </header>
  );
}
function Note({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "info" }) {
  return (
    <p className={`adm-note${tone === "info" ? " is-info" : ""}`}>
      <Info size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

// ---------- Catalogue ----------

export function CatalogueView({
  lang,
  admin,
  data,
  rates,
}: {
  lang: Lang;
  admin: Admin;
  data: Awaited<ReturnType<typeof loadCatalogue>>;
  rates: Awaited<ReturnType<typeof loadCommissionRates>>;
}) {
  const t = toolsTextFor(lang);
  const c = t.catalogue;
  return (
    <AdmShell t={dashTextFor(lang)} active="catalogue" admin={admin}>
      <div className="adm-content">
        <PageHead title={c.title} subtitle={c.subtitle} />
        <section className="adm-card" aria-labelledby="adm-cat">
          <CardHead Icon={Tags} title={c.list}>
            <span className="adm-muted adm-small">{data.rows.length}</span>
          </CardHead>
          <Note tone="info">
            {c.durationsNote} <Link href="/admin">→</Link> {c.onQuoteNote}
          </Note>
          <CatalogueEditor rows={data.rows} />
        </section>
        <section className="adm-card" aria-labelledby="adm-rates">
          <CardHead Icon={Percent} title={c.rates.title} />
          <Note tone="info">{rates.ready ? c.rates.note : c.rates.missing}</Note>
          <CommissionRatesForm initial={rates.rates} ready={rates.ready} />
        </section>
      </div>
    </AdmShell>
  );
}

// ---------- Promotions ----------

export function PromotionsView({ lang, admin, data, openNew }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadPromotions>>; openNew: boolean }) {
  const t = toolsTextFor(lang);
  const p = t.promotions;
  const locale = localeOf(lang);
  const f = formatters(locale);
  const day = (s: number) => new Date(s * 1000).toLocaleDateString(locale);
  const ready = data.configured && !("error" in data);
  const STATUS_CLASS: Record<string, string> = { active: "is-ok", scheduled: "is-warn", expired: "is-muted", exhausted: "is-muted", disabled: "is-muted" };

  return (
    <AdmShell t={dashTextFor(lang)} active="promotions" admin={admin}>
      <div className="adm-content">
        <PageHead title={p.title} subtitle={p.subtitle}>
          {ready && <NewPromotionButton openOnLoad={openNew} />}
        </PageHead>
        {!data.configured ? (
          <Note>{p.notConfigured}</Note>
        ) : "error" in data ? (
          <Note>{p.loadError}</Note>
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={Tag} label={p.kpi.active} value={f.num(data.kpis.active)} />
              <Kpi Icon={CalendarClock} label={p.kpi.scheduled} value={f.num(data.kpis.scheduled)} />
              <Kpi Icon={ShoppingCart} label={p.kpi.redemptions} value={f.num(data.kpis.redemptions)} />
              <Kpi Icon={Ticket} label={p.kpi.total} value={f.num(data.kpis.total)} />
            </section>
            {!data.livemode && <Note>{p.testMode}</Note>}
            <section className="adm-card" aria-labelledby="adm-promos">
              <CardHead Icon={Tag} title={p.list} />
              <p className="adm-muted adm-small">{p.scope}</p>
              {data.rows.length === 0 ? (
                <p className="adm-empty">{p.empty}</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">{p.cols.name}</th>
                        <th scope="col">{p.cols.target}</th>
                        <th scope="col" className="num">{p.cols.reduction}</th>
                        <th scope="col">{p.cols.period}</th>
                        <th scope="col">{p.cols.code}</th>
                        <th scope="col" className="num">{p.cols.usage}</th>
                        <th scope="col">{p.cols.status}</th>
                        <th scope="col">{p.cols.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.id}>
                          <td data-label={p.cols.name}>
                            <span className="adm-stack">
                              <strong>{r.name}</strong>
                              <span className="adm-person-mail">{p.durations[r.duration]}</span>
                            </span>
                          </td>
                          <td data-label={p.cols.target}>{p.targets[r.target]}</td>
                          <td data-label={p.cols.reduction} className="num">
                            <strong>{r.percentOff !== null ? `-${r.percentOff.toLocaleString(locale)} %` : r.amountOffCents !== null ? `-${f.euros(r.amountOffCents)}` : "—"}</strong>
                          </td>
                          <td data-label={p.cols.period}>
                            {!r.startsAt && !r.expiresAt ? (
                              <span className="adm-muted">{p.always}</span>
                            ) : (
                              <span className="adm-stack">
                                {r.startsAt && <span>{p.from(day(r.startsAt))}</span>}
                                {r.expiresAt && <span>{p.until(day(r.expiresAt))}</span>}
                              </span>
                            )}
                          </td>
                          <td data-label={p.cols.code}>
                            <code className="adm-code is-strong">{r.code}</code>
                          </td>
                          <td data-label={p.cols.usage} className="num">
                            {f.num(r.timesRedeemed)}
                            {r.maxRedemptions ? ` / ${f.num(r.maxRedemptions)}` : ""}
                          </td>
                          <td data-label={p.cols.status}>
                            <span className={`adm-badge ${STATUS_CLASS[r.status]}`}>{p.statuses[r.status]}</span>
                          </td>
                          <td data-label={p.cols.actions}>{r.status !== "expired" && r.status !== "exhausted" && <PromotionToggle id={r.id} active={r.active} />}</td>
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

// ---------- Documents ----------

export function DocumentsView({ lang, admin, data }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadDocuments>> }) {
  const t = toolsTextFor(lang);
  const d = t.documents;
  const locale = localeOf(lang);
  const f = formatters(locale);
  const quotes = dashTextFor(lang).crm.quotes;
  const DOC_CLASS: Record<string, string> = { brouillon: "is-muted", en_attente: "is-warn", validee: "is-ok", payee: "is-ok", annulee: "is-muted" };
  const categoryOptions = Object.entries(d.categories)
    .filter(([k]) => k)
    .map(([value, label]) => ({ value, label }));

  return (
    <AdmShell t={dashTextFor(lang)} active="documents" admin={admin}>
      <div className="adm-content">
        <PageHead title={d.title} subtitle={d.subtitle} />
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={FolderOpen} label={d.kpi.library} value={f.num(data.kpis.library)} />
          <Kpi Icon={FileText} label={d.kpi.quotes} value={f.num(data.kpis.quotesInvoices)} />
          <Kpi Icon={Film} label={d.kpi.files} value={f.num(data.kpis.projectFiles)} />
        </section>
        {!data.storageReady && <Note>{d.storageMissing}</Note>}

        <section className="adm-card" aria-labelledby="adm-lib">
          <CardHead Icon={FolderOpen} title={d.library}>
            {data.storageReady && <UploadButton mode="library" categories={categoryOptions} />}
          </CardHead>
          <LibraryGrid files={data.library} categories={d.categories} />
        </section>

        <div className="adm-split">
          <section className="adm-card" aria-labelledby="adm-qi">
            <CardHead Icon={Receipt} title={d.quotes}>
              <Link href="/admin/devis-factures" className="adm-link">
                {d.seeAll}
              </Link>
            </CardHead>
            {!data.docsReady ? (
              <Note>{quotes.notReady}</Note>
            ) : data.pieces.length === 0 ? (
              <p className="adm-empty">{d.noQuotes}</p>
            ) : (
              <ul className="adm-list">
                {data.pieces.map((q) => (
                  <li key={q.id}>
                    {q.kind === "facture" ? <Receipt size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                    <span className="adm-stack">
                      <Link className="adm-person" href={`/admin/document?id=${q.id}`}>
                        <strong>
                          {q.number} — {q.client}
                        </strong>
                      </Link>
                      <span className="adm-person-mail">
                        {quotes.types[q.kind] ?? q.kind} · {f.date(q.date)} · {f.euros(q.amountCents)}
                      </span>
                    </span>
                    <span className={`adm-badge ${DOC_CLASS[q.status] ?? "is-info"}`}>{quotes.statuses[q.status] ?? q.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="adm-card" aria-labelledby="adm-pf">
            <CardHead Icon={Film} title={d.files}>
              {data.storageReady && <UploadButton mode="project" projects={data.projectChoices} />}
            </CardHead>
            {data.assets.length === 0 ? (
              <p className="adm-empty">{d.noFiles}</p>
            ) : (
              <ul className="adm-list">
                {data.assets.slice(0, 30).map((pf) => (
                  <li key={pf.key}>
                    <Film size={16} aria-hidden="true" />
                    <span className="adm-stack">
                      <strong title={pf.name}>{pf.name}</strong>
                      <span className="adm-person-mail">
                        {pf.reference} — {pf.client} · {d.fileSources[pf.source]}
                      </span>
                    </span>
                    {pf.path ? (
                      <FileActions path={pf.path} name={pf.name} />
                    ) : pf.url ? (
                      <a className="adm-link" href={pf.url} target="_blank" rel="noopener noreferrer nofollow">
                        {d.open}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdmShell>
  );
}

// ---------- Agenda ----------

export function AgendaView({
  lang,
  admin,
  data,
  filter,
  taskOptions,
}: {
  lang: Lang;
  admin: Admin;
  data: Awaited<ReturnType<typeof loadAgenda>>;
  filter: AgendaFilter;
  taskOptions: TaskOptions | null;
}) {
  const t = toolsTextFor(lang);
  const a = t.agenda;
  const locale = localeOf(lang);
  const f = formatters(locale);

  // Group by day, with "Aujourd'hui" / "Demain" headings.
  const key = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const now = new Date();
  const todayKey = key(now.toISOString());
  const tomorrowKey = key(new Date(now.getTime() + 86_400_000).toISOString());
  const groups = new Map<string, typeof data.items>();
  for (const item of data.items) {
    const k = key(item.at);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  const heading = (iso: string) => {
    const k = key(iso);
    if (k === todayKey) return a.today;
    if (k === tomorrowKey) return a.tomorrow;
    return new Date(iso).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  };
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <AdmShell t={dashTextFor(lang)} active="agenda" admin={admin}>
      <div className="adm-content">
        <PageHead title={a.title} subtitle={a.subtitle}>
          {data.tasksReady && <NewTaskButton options={taskOptions} />}
        </PageHead>
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={CalendarDays} label={a.kpi.today} value={f.num(data.kpis.today)} />
          <Kpi Icon={CalendarClock} label={a.kpi.week} value={f.num(data.kpis.week)} />
          <Kpi Icon={CalendarX} label={a.kpi.overdue} value={f.num(data.kpis.overdueTasks)} />
        </section>
        {!data.tasksReady && <Note>{a.tasksMissing}</Note>}

        <div className="adm-grid">
          <section className="adm-card adm-span-2" aria-labelledby="adm-timeline">
            <CardHead Icon={CalendarDays} title={a.timeline} />
            <FilterBar
              fields={[
                { name: "source", label: a.sources[""], value: filter.source, options: Object.entries(a.sources).map(([value, label]) => ({ value, label })) },
                {
                  name: "periode",
                  label: a.ranges.mois,
                  value: filter.range === "mois" ? "" : filter.range,
                  options: (["mois", "semaine", "tout"] as const).map((r) => ({ value: r === "mois" ? "" : r, label: a.ranges[r] })),
                },
              ]}
            />
            {data.items.length === 0 ? (
              <p className="adm-empty">{a.empty}</p>
            ) : (
              <div className="adm-timeline">
                {[...groups.entries()].map(([k, items]) => (
                  <section key={k} aria-label={heading(items[0]!.at)}>
                    <h3 className={k === todayKey ? "is-today" : undefined}>{heading(items[0]!.at)}</h3>
                    <ul>
                      {items.map((i) => (
                        <li key={i.id} className={`${i.done ? "is-done" : ""} ${i.overdue ? "is-overdue" : ""}`}>
                          <span className="adm-time">{i.allDay ? a.allDay : time(i.at)}</span>
                          <span className="adm-stack">
                            <strong>{i.title}</strong>
                            <span className="adm-person-mail">
                              {a.kinds[i.kind]}
                              {i.subtitle ? ` · ${i.subtitle}` : ""}
                            </span>
                          </span>
                          <span className="adm-tags">
                            {i.overdue && <span className="adm-badge is-danger">{a.overdue}</span>}
                            {i.done && <span className="adm-badge is-ok">{a.done}</span>}
                            <span className={`adm-badge ${i.source === "video" ? "is-video" : "is-info"}`}>{a.sources[i.source]}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>

          <section className="adm-card" aria-labelledby="adm-admintasks">
            <CardHead Icon={ListChecks} title={a.adminTasks} />
            {!data.tasksReady ? (
              <Note>{a.tasksMissing}</Note>
            ) : data.adminTasks.length === 0 ? (
              <p className="adm-empty">{a.noAdminTasks}</p>
            ) : (
              <ul className="adm-list">
                {data.adminTasks.map((task) => (
                  <li key={task.id} className={task.status === "fait" ? "is-done" : undefined}>
                    <span className="adm-stack">
                      <strong>{task.title}</strong>
                      <span className="adm-person-mail">
                        {task.assignee} · {a.kinds[task.type]} · {new Date(task.dueAt).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {task.overdue && <span className="adm-badge is-danger">{a.overdue}</span>}
                    </span>
                    <TaskActions id={task.id} title={task.title} done={task.status === "fait"} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdmShell>
  );
}

// ---------- Rapports ----------

export function RapportsView({ lang, admin, data }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadReports>> }) {
  const t = toolsTextFor(lang);
  const r = t.rapports;
  const dt = dashTextFor(lang);
  const locale = localeOf(lang);
  const f = formatters(locale);
  const period: ReportPeriod = data.period;
  const exportPeriod = period === "3m" ? "12m" : period;

  return (
    <AdmShell t={dt} active="rapports" admin={admin}>
      <div className="adm-content">
        <PageHead title={r.title} subtitle={r.subtitle}>
          <a className="adm-btn is-ghost" href={`/admin/rapports/export?periode=${exportPeriod}`} download>
            <Receipt size={15} aria-hidden="true" />
            {r.export}
          </a>
        </PageHead>
        <nav className="adm-chips" aria-label={r.title}>
          {REPORT_PERIODS.map((p) => (
            <Link key={p} href={p === "12m" ? "/admin/rapports" : `/admin/rapports?periode=${p}`} className={p === period ? "is-active" : undefined} aria-current={p === period ? "true" : undefined} scroll={false}>
              {r.periods[p]}
            </Link>
          ))}
        </nav>
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={Euro} label={r.kpi.revenue} value={f.euros(data.kpis.revenueCents)} />
          <Kpi Icon={ShoppingCart} label={r.kpi.sales} value={f.num(data.kpis.sales)} />
          <Kpi Icon={UserPlus} label={r.kpi.newClients} value={f.num(data.kpis.newClients)} />
          <Kpi Icon={Receipt} label={r.kpi.average} value={f.euros(data.kpis.averageCents)} />
          <Kpi Icon={Wallet} label={r.kpi.collected30} value={f.euros(data.kpis.collected30Cents)} />
        </section>

        <div className="adm-split is-wide-left">
          <section className="adm-card" aria-labelledby="adm-trend">
            <CardHead Icon={BarChart3} title={r.trend} />
            <RevenueChart series={data.trend} label={r.trend} />
            <p className="adm-muted adm-small">{r.trendNote}</p>
          </section>
          <section className="adm-card" aria-labelledby="adm-cats">
            <CardHead Icon={Tags} title={r.categories} />
            {data.categories.length === 0 ? (
              <p className="adm-empty">{r.noCategories}</p>
            ) : (
              <ul className="adm-bars">
                {data.categories.map((c) => (
                  <li key={c.name}>
                    <span className="adm-bars-top">
                      <strong>{c.name}</strong>
                      <span>
                        {f.euros(c.cents)} · {c.share.toLocaleString(locale)} %
                      </span>
                    </span>
                    <span className="adm-bar" aria-hidden="true">
                      <span style={{ width: `${Math.max(c.share, 1)}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="adm-card" aria-labelledby="adm-top">
          <CardHead Icon={ShoppingCart} title={r.top} />
          {data.topProducts.length === 0 ? (
            <p className="adm-empty">{r.noTop}</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">{r.cols.product}</th>
                    <th scope="col" className="num">{r.cols.count}</th>
                    <th scope="col" className="num">{r.cols.revenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p.name}>
                      <td data-label="#">{i + 1}</td>
                      <td data-label={r.cols.product}>
                        <strong>{p.name}</strong>
                      </td>
                      <td data-label={r.cols.count} className="num">{f.num(p.count)}</td>
                      <td data-label={r.cols.revenue} className="num">{f.euros(p.cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Same team rows as the Commerciaux / Vidéastes pages (shared builders). */}
        <div className="adm-split">
          <section className="adm-card" aria-labelledby="adm-rc">
            <CardHead Icon={Users} title={dt.team.commerciaux}>
              <Link href="/admin/commerciaux" className="adm-link">
                {dt.team.seeAll}
              </Link>
            </CardHead>
            {data.commerciaux === null ? (
              <p className="adm-note">{dt.migration}</p>
            ) : data.commerciaux.length === 0 ? (
              <p className="adm-empty">{dt.team.emptyCommerciaux}</p>
            ) : (
              <ul className="adm-bars">
                {data.commerciaux.map((c) => (
                  <li key={c.id}>
                    <span className="adm-bars-top">
                      <Link href={`/admin/commercial-detail?id=${c.id}`} className="adm-person">
                        {c.name}
                      </Link>
                      <span>
                        {f.euros(c.caMonth)} · {f.num(c.salesMonth)} · {f.pct(c.conversion)}
                      </span>
                    </span>
                    {c.progress !== null && (
                      <span className="adm-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, c.progress)}%` }} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="adm-card" aria-labelledby="adm-rv">
            <CardHead Icon={Film} title={dt.team.videastes}>
              <Link href="/admin/videastes" className="adm-link">
                {dt.team.seeAll}
              </Link>
            </CardHead>
            {data.videastes === null ? (
              <p className="adm-note">{dt.migration}</p>
            ) : data.videastes.length === 0 ? (
              <p className="adm-empty">{dt.team.emptyVideastes}</p>
            ) : (
              <ul className="adm-bars">
                {data.videastes.map((v) => (
                  <li key={v.id}>
                    <span className="adm-bars-top">
                      <Link href={`/admin/videaste-detail?id=${v.id}`} className="adm-person">
                        {v.name}
                      </Link>
                      <span>
                        {dt.team.activeProjects} {f.num(v.activeProjects)} · {dt.team.delivered} {f.num(v.delivered)} · {dt.team.late} {f.num(v.late)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdmShell>
  );
}

// ---------- Paramètres ----------

export const SETTINGS_TABS = ["profil", "entreprise", "equipe", "notifications", "securite"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function ParametresView({ lang, admin, data, tab }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadSettings>>; tab: SettingsTab }) {
  const t = toolsTextFor(lang);
  const p = t.parametres;
  const dt = dashTextFor(lang);
  const locale = localeOf(lang);
  const companyValues = Object.fromEntries(Object.keys(p.entreprise.fields).map((k) => [k, data.company[k as keyof typeof data.company] === COMPANY[k as keyof typeof COMPANY] ? "" : String(data.company[k as keyof typeof data.company] ?? "")]));
  const companyDefaults = Object.fromEntries(Object.keys(p.entreprise.fields).map((k) => [k, String(COMPANY[k as keyof typeof COMPANY] ?? "")]));

  return (
    <AdmShell t={dt} active="parametres" admin={admin}>
      <div className="adm-content">
        <PageHead title={p.title} subtitle={p.subtitle} />
        <section className="adm-card">
          <nav className="adm-chips adm-tabs" aria-label={p.title}>
            {SETTINGS_TABS.map((id) => (
              <Link key={id} href={id === "profil" ? "/admin/parametres" : `/admin/parametres?onglet=${id}`} className={tab === id ? "is-active" : undefined} aria-current={tab === id ? "page" : undefined} scroll={false}>
                {p.tabs[id]}
              </Link>
            ))}
          </nav>

          {tab === "profil" && (
            <>
              <h2 className="adm-subhead">{p.profil.title}</h2>
              <ProfileForm firstName={data.profile.firstName} lastName={data.profile.lastName} phone={data.profile.phone} />
              <dl className="adm-dl">
                <div>
                  <dt>{p.profil.email}</dt>
                  <dd>
                    {data.profile.email}
                    <small className="adm-muted"> — {p.profil.emailHint}</small>
                  </dd>
                </div>
                <div>
                  <dt>{p.profil.role}</dt>
                  <dd>
                    <span className="adm-badge is-info">{p.equipe.roles.admin}</span>
                  </dd>
                </div>
                {data.profile.lastSignIn && (
                  <div>
                    <dt>{p.profil.lastSignIn}</dt>
                    <dd>{new Date(data.profile.lastSignIn).toLocaleString(locale)}</dd>
                  </div>
                )}
              </dl>
              <h2 className="adm-subhead">
                <KeyRound size={16} aria-hidden="true" /> {p.profil.password.title}
              </h2>
              <PasswordForm />
            </>
          )}

          {tab === "entreprise" && (
            <>
              <h2 className="adm-subhead">{p.entreprise.title}</h2>
              <p className="adm-muted adm-small">{p.entreprise.intro}</p>
              <CompanyForm values={companyValues} defaults={companyDefaults} />
            </>
          )}

          {tab === "equipe" && (
            <>
              <div className="adm-card-head">
                <h2 className="adm-subhead">{p.equipe.title}</h2>
                <span className="adm-row-actions">
                  <AddStaffButton role="commercial" label={dt.commerciaux.add} />
                  <AddStaffButton role="videaste" label={dt.videastes.add} />
                </span>
              </div>
              <p className="adm-muted adm-small">{p.equipe.intro}</p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">{p.equipe.cols.name}</th>
                      <th scope="col">{p.equipe.cols.role}</th>
                      <th scope="col">{p.equipe.cols.status}</th>
                      <th scope="col">{p.equipe.cols.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.team.map((m) => {
                      const detailHref =
                        m.role === "commercial"
                          ? `/admin/commercial-detail?id=${m.id}`
                          : m.role === "videaste"
                            ? `/admin/videaste-detail?id=${m.id}`
                            : null;
                      return (
                        <tr key={m.id}>
                          <td data-label={p.equipe.cols.name}>
                            <span className="adm-stack">
                              {detailHref ? (
                                <Link className="adm-person" href={detailHref} aria-label={`${p.equipe.open} — ${m.name}`}>
                                  {m.name}
                                </Link>
                              ) : (
                                <strong>{m.name}</strong>
                              )}
                              <span className="adm-person-mail">{m.email}</span>
                            </span>
                          </td>
                          <td data-label={p.equipe.cols.role}>
                            <span className={`adm-badge ${m.role === "admin" ? "is-info" : m.role === "videaste" ? "is-video" : "is-ok"}`}>{p.equipe.roles[m.role]}</span>
                          </td>
                          <td data-label={p.equipe.cols.status}>
                            <span className={`adm-badge ${m.active ? "is-ok" : "is-muted"}`}>{m.active ? dt.team.active : dt.team.inactive}</span>
                          </td>
                          <td data-label={p.equipe.cols.actions}>
                            {detailHref ? (
                              <span className="adm-row-actions">
                                <StaffOpenLink href={detailHref} label={p.equipe.edit} />
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "notifications" && (
            <>
              <h2 className="adm-subhead">{p.notifications.title}</h2>
              <p className="adm-muted adm-small">{p.notifications.intro(data.security.teamRecipients)}</p>
              {!data.security.email && <Note>{p.notifications.noEmail}</Note>}
              <NotificationsForm initial={data.notifications} />
            </>
          )}

          {tab === "securite" && (
            <>
              <h2 className="adm-subhead">
                <ShieldCheck size={16} aria-hidden="true" /> {p.securite.status}
              </h2>
              <dl className="adm-dl">
                <div>
                  <dt>{p.securite.migrations}</dt>
                  <dd className="adm-tags">
                    {data.security.migrations.map((m) => (
                      <span key={m.id} className={`adm-badge ${m.ok ? "is-ok" : "is-warn"}`} title={m.ok ? p.securite.applied : p.securite.missing}>
                        {m.id} · {m.ok ? p.securite.applied : p.securite.missing}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>{p.securite.email}</dt>
                  <dd>
                    <span className={`adm-badge ${data.security.email ? "is-ok" : "is-warn"}`}>{data.security.email ? p.securite.configured : p.securite.notConfigured}</span>
                  </dd>
                </div>
                <div>
                  <dt>{p.securite.stripe}</dt>
                  <dd>
                    <span className={`adm-badge ${data.security.stripe === "live" ? "is-ok" : "is-warn"}`}>{p.securite.stripeModes[data.security.stripe]}</span>
                  </dd>
                </div>
                <div>
                  <dt>{p.securite.openai}</dt>
                  <dd>
                    <span className={`adm-badge ${data.security.openai ? "is-ok" : "is-muted"}`}>{data.security.openai ? p.securite.configured : p.securite.notConfigured}</span>
                  </dd>
                </div>
              </dl>
              <h2 className="adm-subhead">
                <KeyRound size={16} aria-hidden="true" /> {p.securite.rules}
              </h2>
              <ul className="adm-checklist">
                {p.securite.list.map((rule) => (
                  <li key={rule}>
                    <CircleCheck size={15} aria-hidden="true" />
                    {rule}
                  </li>
                ))}
              </ul>
              <h2 className="adm-subhead">
                <Settings size={16} aria-hidden="true" /> {t.audit.title}
              </h2>
              <p className="adm-muted adm-small">{t.audit.intro}</p>
              {data.auditLog === null ? (
                <Note>{t.audit.missing}</Note>
              ) : data.auditLog.length === 0 ? (
                <p className="adm-empty">{t.audit.empty}</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">{t.audit.cols.date}</th>
                        <th scope="col">{t.audit.cols.actor}</th>
                        <th scope="col">{t.audit.cols.action}</th>
                        <th scope="col">{t.audit.cols.target}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.auditLog.map((e) => (
                        <tr key={e.id}>
                          <td data-label={t.audit.cols.date}>{new Date(e.at).toLocaleString(locale)}</td>
                          <td data-label={t.audit.cols.actor}>{e.actor}</td>
                          <td data-label={t.audit.cols.action}>{t.audit.actions[e.action] ?? e.action}</td>
                          <td data-label={t.audit.cols.target}>
                            <code className="adm-code">{e.target}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AdmShell>
  );
}
