import Link from "next/link";
import {
  BadgePercent,
  Briefcase,
  CalendarX,
  ChevronRight,
  Euro,
  Filter,
  Flame,
  Globe,
  Info,
  Percent,
  ShoppingCart,
  TriangleAlert,
  UserX,
  Users,
  Video,
  Wallet,
  CircleCheck,
  UserPlus,
  CalendarClock,
  Tag,
} from "lucide-react";
import { AdmShell } from "./AdmShell";
import { ConversionFunnel } from "./ConversionFunnel";
import { RevenueChart } from "./RevenueChart";
import { dashTextFor, type DashText } from "./dashText";
import { initialsOf } from "./initials";
import { Delta, Kpi, LOAD_CLASS, MigrationNote, formatters, type Fmt } from "./ui";
import { localeOf, type Lang } from "@/config/languages";
import { PERIODS, type DashboardData } from "@/lib/admin/dashboard";

function UrgentList({ t, urgent }: { t: DashText; urgent: DashboardData["urgent"] }) {
  const items = [
    { key: "pendingCommissions", n: urgent.pendingCommissions, Icon: BadgePercent, href: "/admin/commissions?statut=en_attente" },
    { key: "latePayments", n: urgent.latePayments, Icon: Wallet, href: "/admin/prospects?etape=acompte_en_attente" },
    { key: "unassignedProspects", n: urgent.unassignedProspects, Icon: UserX, href: "/admin/prospects?commercial=aucun" },
    { key: "overdueProjects", n: urgent.overdueProjects, Icon: CalendarX, href: "/admin/projets-video?statut=retard" },
    { key: "overloadedVideastes", n: urgent.overloadedVideastes, Icon: Flame, href: "/admin/videastes?tri=charge" },
  ] as const;
  const shown = items.filter((i) => i.n !== null && i.n > 0);
  const missing = items.some((i) => i.n === null);

  return (
    <>
      {shown.length === 0 ? (
        <p className="adm-empty">{t.urgent.empty}</p>
      ) : (
        <ul className="adm-urgent">
          {shown.map(({ key, n, Icon, href }) => (
            <li key={key}>
              <Link href={href} className={`adm-urgent-item is-${key}`} title={t.urgent.hints[key]}>
                <span className="adm-urgent-ic" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>
                  <strong>{t.urgent[key](n!)}</strong>
                  <small>{t.urgent.hints[key]}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {missing && <MigrationNote t={t} />}
    </>
  );
}


function CommerciauxCard({ t, rows, f }: { t: DashText; rows: DashboardData["commercialRows"]; f: Fmt }) {
  return (
    <section className="adm-card" id="equipe-commerciaux" aria-labelledby="adm-comm-title">
      <header className="adm-card-head">
        <h2 id="adm-comm-title">
          <Briefcase size={17} aria-hidden="true" />
          {t.team.commerciaux}
        </h2>
        <Link href="/admin/commerciaux" className="adm-link">
          {t.team.seeAll} <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </header>
      {rows === null ? (
        <MigrationNote t={t} />
      ) : rows.length === 0 ? (
        <p className="adm-empty">{t.team.emptyCommerciaux}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">{t.team.name}</th>
                <th scope="col" className="num">{t.team.sales}</th>
                <th scope="col" className="num">{t.team.ca}</th>
                <th scope="col" className="num">{t.team.conversion}</th>
                <th scope="col">{t.team.target}</th>
                <th scope="col" className="num">{t.team.commission}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.active ? undefined : "is-inactive"}>
                  <td data-label={t.team.name}>
                    <Link href={`/admin/commercial-detail?id=${r.id}`} className="adm-person" aria-label={t.team.open(r.name)}>
                      <span className="adm-avatar sm" aria-hidden="true">{initialsOf(r.name)}</span>
                      {r.name}
                      {!r.active && <span className="adm-badge is-muted">{t.team.inactive}</span>}
                    </Link>
                  </td>
                  <td data-label={t.team.sales} className="num">{f.num(r.salesMonth)}</td>
                  <td data-label={t.team.ca} className="num">{f.euros(r.caMonth)}</td>
                  <td data-label={t.team.conversion} className="num">{f.pct(r.conversion)}</td>
                  <td data-label={t.team.target}>
                    {r.progress === null ? (
                      "—"
                    ) : (
                      <span className="adm-progress">
                        <span className="adm-bar" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, r.progress)}%` }} />
                        </span>
                        {r.progress}%
                      </span>
                    )}
                  </td>
                  <td data-label={t.team.commission} className="num">{r.commissionMonth === null ? "—" : f.euros(r.commissionMonth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function VideastesCard({ t, rows, f }: { t: DashText; rows: DashboardData["videasteRows"]; f: Fmt }) {
  return (
    <section className="adm-card" id="equipe-videastes" aria-labelledby="adm-vid-title">
      <header className="adm-card-head">
        <h2 id="adm-vid-title">
          <Video size={17} aria-hidden="true" />
          {t.team.videastes}
        </h2>
        <Link href="/admin/videastes" className="adm-link">
          {t.team.seeAll} <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </header>
      {rows === null ? (
        <MigrationNote t={t} />
      ) : rows.length === 0 ? (
        <p className="adm-empty">{t.team.emptyVideastes}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">{t.team.name}</th>
                <th scope="col" className="num">{t.team.activeProjects}</th>
                <th scope="col" className="num">{t.team.delivered}</th>
                <th scope="col" className="num">{t.team.late}</th>
                <th scope="col">{t.team.load}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.active ? undefined : "is-inactive"}>
                  <td data-label={t.team.name}>
                    <Link href={`/admin/videaste-detail?id=${r.id}`} className="adm-person" aria-label={t.team.open(r.name)}>
                      <span className="adm-avatar sm" aria-hidden="true">{initialsOf(r.name)}</span>
                      {r.name}
                    </Link>
                  </td>
                  <td data-label={t.team.activeProjects} className="num">{f.num(r.activeProjects)}</td>
                  <td data-label={t.team.delivered} className="num">{f.num(r.delivered)}</td>
                  <td data-label={t.team.late} className="num">{f.num(r.late)}</td>
                  <td data-label={t.team.load}>
                    <span className={`adm-badge ${LOAD_CLASS[r.load]}`}>{t.team.loads[r.load]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** The admin dashboard screen. Pure rendering: data and the admin check come from app/admin/dashboard/page.tsx. */
type DashPromo = { id: string; code: string; name: string; percentOff: number | null; amountOffCents: number | null; timesRedeemed: number; maxRedemptions: number | null };

export function DashboardView({
  lang,
  admin,
  data,
  promotions = null,
}: {
  lang: Lang;
  admin: { name: string; email: string };
  data: DashboardData;
  /** Active Stripe promotion codes; null when Stripe is not configured / unreachable. */
  promotions?: DashPromo[] | null;
}) {
  const t = dashTextFor(lang);
  const locale = localeOf(lang);
  const f = formatters(locale);
  const { kpis, site, period } = data;

  return (
    <AdmShell t={t} active="dashboard" admin={admin}>
      <div className="adm-content">
        {/* 1. Global KPI row */}
        <section className="adm-kpis is-four" aria-label="KPI">
          <Kpi hero Icon={Euro} label={t.kpi.revenue} hint={t.kpiHint.revenue} value={f.euros(kpis.revenue.value)}>
            <Delta value={kpis.revenue.delta} label={t.vsLastMonth} locale={locale} />
          </Kpi>
          <Kpi Icon={CircleCheck} label={t.kpi.collected} hint={t.kpiHint.collected} value={f.euros(kpis.collected.value)}>
            <Delta value={kpis.collected.delta} label={t.vsLastMonth} locale={locale} />
          </Kpi>
          <Kpi Icon={ShoppingCart} label={t.kpi.orders} hint={t.kpiHint.orders} value={f.num(kpis.orders.value)}>
            <Delta value={kpis.orders.delta} label={t.vsLastMonth} locale={locale} />
          </Kpi>
          <Kpi Icon={Users} label={t.kpi.activeClients} hint={t.kpiHint.activeClients} value={f.num(kpis.activeClients)} />
          <Kpi Icon={UserPlus} label={t.kpi.prospects} hint={t.kpiHint.prospects} value={f.num(kpis.prospects)} />
          <Kpi Icon={Wallet} label={t.kpi.toCollect} hint={t.kpiHint.toCollect} value={f.euros(kpis.toCollect)} />
          <Kpi Icon={Percent} label={t.kpi.conversion} hint={t.kpiHint.conversion} value={f.pct(kpis.conversion.value)}>
            <Delta value={kpis.conversion.delta} label={t.vsPrevPeriod} locale={locale} points />
          </Kpi>
          <Kpi
            Icon={BadgePercent}
            label={t.kpi.commissions}
            hint={t.kpiHint.commissions}
            value={kpis.pendingCommissions === null ? t.unavailable : f.euros(kpis.pendingCommissions)}
          />
        </section>

        <div className="adm-grid">
          {/* 2. Site performance + revenue sparkline */}
          <section className="adm-card adm-span-2" aria-labelledby="adm-site-title">
            <header className="adm-card-head">
              <h2 id="adm-site-title">
                <Globe size={17} aria-hidden="true" />
                {t.site.title}
              </h2>
            </header>
            <nav className="adm-chips" aria-label={t.site.title}>
              {PERIODS.map((p) => (
                <Link
                  key={p}
                  href={p === "30j" ? "/admin/dashboard" : `/admin/dashboard?periode=${p}`}
                  className={p === period ? "is-active" : undefined}
                  aria-current={p === period ? "true" : undefined}
                  scroll={false}
                >
                  {t.site.periods[p]}
                </Link>
              ))}
            </nav>
            <dl className="adm-stats">
              {(
                [
                  ["signups", f.num(site.signups.value), site.signups.delta],
                  ["requests", f.num(site.requests.value), site.requests.delta],
                  ["checkouts", f.num(site.checkouts.value), site.checkouts.delta],
                  ["paid", f.num(site.paid.value), site.paid.delta],
                  ["revenue", f.euros(site.revenue.value), site.revenue.delta],
                  ["conversion", f.pct(site.conversion), null],
                ] as const
              ).map(([key, value, d]) => (
                <div key={key}>
                  <dt>{t.site[key]}</dt>
                  <dd>
                    {value}
                    <Delta value={d} label={t.vsPrevPeriod} locale={locale} />
                  </dd>
                </div>
              ))}
            </dl>
            <h3 className="adm-subhead">
              {t.revenueChart.title} <small>{t.revenueChart.subtitle}</small>
            </h3>
            <RevenueChart series={data.revenueSeries} />
            <p className="adm-note">
              <Info size={15} aria-hidden="true" />
              {t.site.analyticsNote}
            </p>
          </section>

          {/* 3. Conversion funnel + RGPD-safe abandoned carts modal */}
          <section className="adm-card" aria-labelledby="adm-funnel-title">
            <header className="adm-card-head">
              <h2 id="adm-funnel-title">
                <Filter size={17} aria-hidden="true" />
                {t.funnel.title}
              </h2>
            </header>
            <p className="adm-muted">{t.funnel.subtitle}</p>
            <ConversionFunnel funnel={data.funnel} carts={data.abandonedCarts} />
          </section>

          {/* 4. Urgent items */}
          <section className="adm-card" aria-labelledby="adm-urgent-title">
            <header className="adm-card-head">
              <h2 id="adm-urgent-title">
                <TriangleAlert size={17} aria-hidden="true" />
                {t.urgent.title}
              </h2>
            </header>
            <UrgentList t={t} urgent={data.urgent} />
          </section>

          {/* 5. Team performance */}
          <div className="adm-span-2 adm-teams">
            <CommerciauxCard t={t} rows={data.commercialRows} f={f} />
            <VideastesCard t={t} rows={data.videasteRows} f={f} />
          </div>

          {/* Upcoming deadlines + running promotions (handoff dashboard, bottom row) */}
          <div className="adm-span-2 adm-teams adm-bottom-row">
            <section className="adm-card" aria-labelledby="adm-deadlines-title">
              <header className="adm-card-head">
                <h2 id="adm-deadlines-title">
                  <CalendarClock size={17} aria-hidden="true" />
                  {t.deadlines.title}
                </h2>
                <Link href="/admin/projets-video" className="adm-link">
                  {t.deadlines.seeAll} <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </header>
              {data.deadlines === null ? (
                <MigrationNote t={t} />
              ) : data.deadlines.length === 0 ? (
                <p className="adm-empty">{t.deadlines.empty}</p>
              ) : (
                <ul className="adm-list">
                  {data.deadlines.map((d) => (
                    <li key={d.id} className={d.late ? "is-overdue" : undefined}>
                      <CalendarClock size={16} aria-hidden="true" />
                      <span className="adm-stack">
                        <strong>
                          {d.reference} — {d.client}
                        </strong>
                        <span className="adm-person-mail">{d.videaste ?? t.deadlines.unassigned}</span>
                      </span>
                      <span className={`adm-badge ${d.late ? "is-danger" : "is-info"}`}>{d.late ? `${t.deadlines.late} · ${f.date(d.deadline)}` : f.date(d.deadline)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="adm-card" aria-labelledby="adm-promos-title">
              <header className="adm-card-head">
                <h2 id="adm-promos-title">
                  <Tag size={17} aria-hidden="true" />
                  {t.promos.title}
                </h2>
                <Link href="/admin/promotions" className="adm-link">
                  {t.promos.seeAll} <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </header>
              {promotions === null ? (
                <p className="adm-empty">{t.promos.notConfigured}</p>
              ) : promotions.length === 0 ? (
                <p className="adm-empty">{t.promos.empty}</p>
              ) : (
                <ul className="adm-list">
                  {promotions.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <Tag size={16} aria-hidden="true" />
                      <span className="adm-stack">
                        <strong>{p.name}</strong>
                        <span className="adm-person-mail">
                          <code className="adm-code is-strong">{p.code}</code> · {t.promos.used(p.timesRedeemed)}
                          {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}
                        </span>
                      </span>
                      <strong>{p.percentOff !== null ? `-${p.percentOff} %` : p.amountOffCents !== null ? `-${f.euros(p.amountOffCents)}` : ""}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </AdmShell>
  );
}

