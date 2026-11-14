import Link from "next/link";
import {
  BadgePercent,
  Briefcase,
  CalendarX,
  CircleCheck,
  Euro,
  FileText,
  Film,
  Flame,
  MessageSquareWarning,
  Percent,
  ShoppingCart,
  Target,
  Users,
  Video,
} from "lucide-react";
import { localeOf, type Lang } from "@/config/languages";
import { NORMAL_LOAD_AT, OVERLOAD_AT, type loadCommercialDetail, type loadCommerciaux, type loadVideasteDetail, type loadVideastes } from "@/lib/admin/team";
import { adminTextFor } from "../adminText";
import { AdmShell } from "./AdmShell";
import { dashTextFor, type DashText } from "./dashText";
import { initialsOf } from "./initials";
import { ProjectTable } from "./ProjectTable";
import { CommerciauxRoster, VideastesRoster } from "./Roster";
import { AddStaffButton, StaffSettings } from "./StaffManage";
import { ProfileForm } from "@/components/videaste/ProfileForm";
import { updateVideasteProfile } from "@/lib/admin/videaste-actions";
import { NewTaskButton, type TaskOptions } from "./ToolsClient";
import { toolsTextFor } from "./toolsText";
import { Kpi, LOAD_CLASS, MigrationNote, PageHead, formatters } from "./ui";

type Admin = { name: string; email: string };
type Ready<T> = Extract<NonNullable<Awaited<T>>, { migrated: true }>;

// ---------- Roster pages ----------

export function CommerciauxView({ lang, admin, data }: { lang: Lang; admin: Admin; data: Awaited<ReturnType<typeof loadCommerciaux>> }) {
  const t = dashTextFor(lang);
  const c = t.commerciaux;
  const f = formatters(localeOf(lang));

  return (
    <AdmShell t={t} active="commerciaux" admin={admin}>
      <div className="adm-content">
        <PageHead title={c.title} subtitle={c.subtitle}>
          {data.migrated && <AddStaffButton role="commercial" label={c.add} />}
        </PageHead>
        {!data.migrated ? (
          <MigrationNote t={t} />
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={Euro} label={c.kpi.ca} value={f.euros(data.kpis.caMonth)} />
              <Kpi Icon={ShoppingCart} label={c.kpi.sales} value={f.num(data.kpis.salesMonth)} />
              <Kpi Icon={Briefcase} label={c.kpi.active} value={`${data.kpis.active} / ${data.kpis.total}`} />
              <Kpi Icon={FileText} label={c.kpi.quotes} value={f.num(data.kpis.quotesOpen)} />
              <Kpi Icon={Percent} label={c.kpi.conversion} value={f.pct(data.kpis.conversion)} />
              <Kpi Icon={BadgePercent} label={c.kpi.commissions} value={data.kpis.commissionToPay === null ? t.unavailable : f.euros(data.kpis.commissionToPay)} />
            </section>
            <section className="adm-card" aria-labelledby="adm-roster-title">
              <header className="adm-card-head">
                <h2 id="adm-roster-title">
                  <Briefcase size={17} aria-hidden="true" />
                  {c.roster}
                </h2>
              </header>
              {data.rows.length === 0 ? <p className="adm-empty">{c.empty}</p> : <CommerciauxRoster rows={data.rows} />}
            </section>
          </>
        )}
      </div>
    </AdmShell>
  );
}

export function VideastesView({
  lang,
  admin,
  data,
  sortByLoad,
}: {
  lang: Lang;
  admin: Admin;
  data: Awaited<ReturnType<typeof loadVideastes>>;
  sortByLoad?: boolean;
}) {
  const t = dashTextFor(lang);
  const v = t.videastes;
  const f = formatters(localeOf(lang));

  return (
    <AdmShell t={t} active="videastes" admin={admin}>
      <div className="adm-content">
        <PageHead title={v.title} subtitle={v.subtitle}>
          <Link href="/admin/projets-video" className="adm-btn is-ghost">
            <Film size={15} aria-hidden="true" /> Tous les projets
          </Link>
          {data.migrated && <AddStaffButton role="videaste" label={v.add} />}
        </PageHead>
        {!data.migrated ? (
          <MigrationNote t={t} />
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={Film} label={v.kpi.active} value={f.num(data.kpis.activeProjects)} />
              <Kpi Icon={CircleCheck} label={v.kpi.delivered} value={f.num(data.kpis.delivered)} />
              <Kpi Icon={CalendarX} label={v.kpi.late} value={f.num(data.kpis.late)} />
              <Kpi Icon={MessageSquareWarning} label={v.kpi.revisions} value={data.kpis.revisions === null ? t.unavailable : f.num(data.kpis.revisions)} />
              <Kpi Icon={Users} label={v.kpi.team} value={`${data.kpis.active} / ${data.kpis.total}`} />
              <Kpi Icon={Flame} label={v.kpi.overloaded} value={f.num(data.kpis.overloaded)} />
            </section>
            <section className="adm-card" aria-labelledby="adm-roster-title">
              <header className="adm-card-head">
                <h2 id="adm-roster-title">
                  <Video size={17} aria-hidden="true" />
                  {v.roster}
                </h2>
              </header>
              <p className="adm-muted adm-small">{v.loadHint(OVERLOAD_AT, NORMAL_LOAD_AT)}</p>
              {!data.hasRevisions && <p className="adm-note">{v.revisionsNote}</p>}
              {data.rows.length === 0 ? <p className="adm-empty">{v.empty}</p> : <VideastesRoster rows={data.rows} sortByLoad={sortByLoad} hasRevisions={data.hasRevisions} />}
            </section>
          </>
        )}
      </div>
    </AdmShell>
  );
}

// ---------- Detail pages ----------

function DetailHeader({
  t,
  name,
  email,
  active,
  roleLabel,
  section,
  sectionHref,
  extra,
  action,
}: {
  t: DashText;
  name: string;
  email: string;
  active: boolean;
  roleLabel: string;
  section: string;
  sectionHref: string;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <>
      <nav className="adm-crumbs" aria-label="Breadcrumb">
        <Link href="/admin/dashboard">{t.detail.back}</Link>
        <span aria-hidden="true">›</span>
        <Link href={sectionHref}>{section}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{name}</span>
      </nav>
      <header className="adm-profile">
        <span className="adm-avatar lg" aria-hidden="true">
          {initialsOf(name)}
        </span>
        <div>
          <h2>
            {name}
            <span className={`adm-badge ${active ? "is-ok" : "is-muted"}`}>{active ? t.team.active : t.team.inactive}</span>
            {extra}
          </h2>
          <p className="adm-muted">
            {roleLabel} · <a href={`mailto:${email}`}>{email}</a>
          </p>
        </div>
        {action && <div className="adm-profile-actions">{action}</div>}
      </header>
    </>
  );
}

export function CommercialDetailView({
  lang,
  admin,
  data,
  taskOptions = null,
}: {
  lang: Lang;
  admin: Admin;
  data: NonNullable<Awaited<ReturnType<typeof loadCommercialDetail>>>;
  taskOptions?: TaskOptions | null;
}) {
  const t = dashTextFor(lang);
  const c = t.commerciaux;
  const f = formatters(localeOf(lang));
  const statuses = adminTextFor(lang).projects.statuses;
  const { person } = data;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email;
  const active = person.active !== false;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AdmShell t={t} active="commerciaux" admin={admin}>
      <div className="adm-content">
        <DetailHeader
          t={t}
          name={name}
          email={person.email}
          active={active}
          roleLabel={c.cols.name}
          section={c.title}
          sectionHref="/admin/commerciaux"
          action={active && taskOptions ? <NewTaskButton options={taskOptions} presetAssignee={person.id} label={toolsTextFor(lang).assignTask} ghost /> : undefined}
        />
        {!data.migrated ? (
          <MigrationNote t={t} />
        ) : (
          <CommercialDetailBody t={t} f={f} data={data} statuses={statuses} today={today} name={name} active={active} />
        )}
      </div>
    </AdmShell>
  );
}

function CommercialDetailBody({
  t,
  f,
  data,
  statuses,
  today,
  name,
  active,
}: {
  t: DashText;
  f: ReturnType<typeof formatters>;
  data: Ready<ReturnType<typeof loadCommercialDetail>>;
  statuses: Record<string, string>;
  today: string;
  name: string;
  active: boolean;
}) {
  const d = t.commerciaux.detail;
  const { row, person } = data;
  return (
    <>
      <section className="adm-kpis" aria-label="KPI">
        <Kpi hero Icon={Euro} label={d.caMonth} value={f.euros(row.caMonth)} />
        <Kpi Icon={ShoppingCart} label={d.salesMonth} value={f.num(row.salesMonth)} />
        <Kpi Icon={FileText} label={d.quotesOpen} value={`${f.num(row.quotesOpen)} / ${f.num(row.quotesSent)}`} />
        <Kpi Icon={Percent} label={d.conversion} value={f.pct(row.conversion)} />
        <Kpi Icon={Target} label={d.target} value={row.target === null ? "—" : f.euros(row.target)}>
          {row.progress !== null && (
            <span className="adm-progress adm-kpi-progress">
              <span className="adm-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, row.progress)}%` }} />
              </span>
              {row.progress}%
            </span>
          )}
        </Kpi>
        <Kpi Icon={BadgePercent} label={d.commissionMonth} value={row.commissionMonth === null ? t.unavailable : f.euros(row.commissionMonth)}>
          {row.commissionToPay !== null && (
            <span className="adm-kpi-sub">
              {d.commissionToPay} : <strong>{f.euros(row.commissionToPay)}</strong>
            </span>
          )}
        </Kpi>
      </section>

      <div className="adm-split">
        <section className="adm-card" aria-labelledby="adm-sales-title">
          <header className="adm-card-head">
            <h2 id="adm-sales-title">
              <ShoppingCart size={17} aria-hidden="true" />
              {d.sales}
            </h2>
          </header>
          <ProjectTable t={t} f={f} projects={data.sales.slice(0, 20)} statuses={statuses} today={today} showDeadline={false} empty={d.noSales} />
        </section>
        <section className="adm-card" aria-labelledby="adm-quotes-title">
          <header className="adm-card-head">
            <h2 id="adm-quotes-title">
              <FileText size={17} aria-hidden="true" />
              {d.openQuotes}
            </h2>
          </header>
          <ProjectTable t={t} f={f} projects={data.openQuotes} statuses={statuses} today={today} showDeadline={false} empty={d.noQuotes} />
        </section>
      </div>

      <section className="adm-card" aria-labelledby="adm-comm-title">
        <header className="adm-card-head">
          <h2 id="adm-comm-title">
            <BadgePercent size={17} aria-hidden="true" />
            {d.commissions}
          </h2>
        </header>
        {data.commissions === null ? (
          <MigrationNote t={t} />
        ) : data.commissions.length === 0 ? (
          <p className="adm-empty">{d.noCommissions}</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">{t.detail.date}</th>
                  <th scope="col">{d.sale}</th>
                  <th scope="col">{t.detail.status}</th>
                  <th scope="col" className="num">{t.detail.amount}</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((c) => (
                  <tr key={c.id}>
                    <td data-label={t.detail.date}>{f.date(c.created_at)}</td>
                    <td data-label={d.sale}>{(c.project_id && data.references.get(c.project_id)) || "—"}</td>
                    <td data-label={t.detail.status}>
                      <span className={`adm-badge ${c.status === "payee" ? "is-ok" : c.status === "en_attente" ? "is-warn" : "is-info"}`}>
                        {t.detail.commissionStatus[c.status] ?? c.status}
                      </span>
                    </td>
                    <td data-label={t.detail.amount} className="num">{f.euros(c.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-card" aria-labelledby="adm-all-title">
        <header className="adm-card-head">
          <h2 id="adm-all-title">
            <Film size={17} aria-hidden="true" />
            {d.allProjects}
          </h2>
        </header>
        <ProjectTable t={t} f={f} projects={data.projects} statuses={statuses} today={today} empty={t.videastes.detail.noProjects} />
      </section>

      <StaffSettings id={person.id} name={name} role="commercial" active={active} targetCents={person.monthly_target_cents} rate={person.commission_rate} />
    </>
  );
}

export function VideasteDetailView({
  lang,
  admin,
  data,
  taskOptions = null,
}: {
  lang: Lang;
  admin: Admin;
  data: NonNullable<Awaited<ReturnType<typeof loadVideasteDetail>>>;
  taskOptions?: TaskOptions | null;
}) {
  const t = dashTextFor(lang);
  const v = t.videastes;
  const f = formatters(localeOf(lang));
  const statuses = adminTextFor(lang).projects.statuses;
  const { person } = data;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email;
  const active = person.active !== false;

  return (
    <AdmShell t={t} active="videastes" admin={admin}>
      <div className="adm-content">
        <DetailHeader
          t={t}
          name={name}
          email={person.email}
          active={active}
          roleLabel={v.cols.name}
          section={v.title}
          sectionHref="/admin/videastes"
          action={active && taskOptions ? <NewTaskButton options={taskOptions} presetAssignee={person.id} label={toolsTextFor(lang).assignTask} ghost /> : undefined}
          extra={data.migrated ? <span className={`adm-badge ${LOAD_CLASS[data.row.load]}`}>{t.team.loads[data.row.load]}</span> : undefined}
        />
        {!data.migrated ? (
          <MigrationNote t={t} />
        ) : (
          <>
            <section className="adm-kpis" aria-label="KPI">
              <Kpi hero Icon={Film} label={v.detail.active} value={f.num(data.row.activeProjects)} />
              <Kpi Icon={CircleCheck} label={v.detail.delivered} value={f.num(data.row.delivered)} />
              <Kpi Icon={CalendarX} label={v.detail.late} value={f.num(data.row.late)} />
              <Kpi Icon={MessageSquareWarning} label={v.detail.revisions} value={data.row.revisions === null ? t.unavailable : f.num(data.row.revisions)} />
            </section>
            <section className="adm-card" aria-labelledby="adm-projects-title">
              <header className="adm-card-head">
                <h2 id="adm-projects-title">
                  <Film size={17} aria-hidden="true" />
                  {v.detail.projects}
                </h2>
              </header>
              <p className="adm-muted adm-small">{v.loadHint(OVERLOAD_AT, NORMAL_LOAD_AT)}</p>
              {!data.hasRevisions && <p className="adm-note">{v.revisionsNote}</p>}
              <ProjectTable
                t={t}
                f={f}
                projects={data.projects}
                statuses={statuses}
                today={data.today}
                showRevisions={data.hasRevisions}
                empty={v.detail.noProjects}
              />
            </section>
            <section className="adm-card" aria-labelledby="adm-vid-profile">
              <header className="adm-card-head">
                <h2 id="adm-vid-profile">Informations du vidéaste</h2>
              </header>
              <ProfileForm
                initial={{
                  firstName: person.first_name ?? "",
                  lastName: person.last_name ?? "",
                  phone: (person as { phone?: string | null }).phone ?? "",
                  specialties: (person as { specialties?: string[] | null }).specialties ?? [],
                }}
                email={person.email}
                save={updateVideasteProfile.bind(null, person.id)}
              />
            </section>
            <StaffSettings id={person.id} name={name} role="videaste" active={active} />
          </>
        )}
      </div>
    </AdmShell>
  );
}
