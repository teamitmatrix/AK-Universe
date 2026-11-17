import Link from "next/link";
import { Plus, CalendarClock, CircleCheck, ClipboardList, Clock, Euro, FileClock, Info, Phone, ReceiptText, Tag, Target } from "lucide-react";
import { TaskActions } from "@/components/admin/space/ToolsClient";
import { Kpi, formatters } from "@/components/admin/space/ui";
import { localeOf, type Lang } from "@/config/languages";
import { FOLLOW_UP_AFTER_DAYS, type CommercialDashboard } from "@/lib/commercial/dashboard";
import { comTextFor } from "./comText";

/** Display of commercial/dashboard.html (handoff pages 07 / 09). Data comes from loadCommercialDashboard. */
export function CommercialDashboardView({ lang, data }: { lang: Lang; data: CommercialDashboard }) {
  const t = comTextFor(lang);
  const d = t.dash;
  const locale = localeOf(lang);
  const f = formatters(locale);
  const k = data.kpis;
  const euros = (v: number | null) => (v === null ? "—" : f.euros(v));
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>{d.title}</h2>
          <p>{d.subtitle}</p>
        </div>
        <Link href="/commercial/devis-factures?nouveau=facture" className="adm-btn">
          <Plus size={16} aria-hidden="true" /> Nouvelle vente / facture
        </Link>
      </div>

      <div className="adm-kpis com-kpis">
        <Kpi Icon={Euro} label={d.kpis.ca} hint={d.hints.ca} value={f.euros(k.caMonth)} hero />
        <Kpi Icon={Tag} label={d.kpis.sales} value={f.num(k.salesMonth)} />
        <Kpi Icon={ReceiptText} label={d.kpis.commission} hint={d.hints.commission} value={euros(k.commissionMonth)} />
        <Kpi Icon={Clock} label={d.kpis.toPay} hint={d.hints.toPay} value={euros(k.commissionToPay)} />
        <Kpi Icon={CircleCheck} label={d.kpis.paid} hint={d.hints.paid} value={euros(k.commissionPaidMonth)} />
        <Kpi Icon={Target} label={d.kpis.target} value={k.target === null ? "—" : f.euros(k.target)} />
      </div>
      {k.commissionMonth === null && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          {d.commissionsUnavailable}
        </p>
      )}

      <section className="adm-card com-goal" aria-labelledby="com-goal-title">
        <header className="com-goal-head">
          <h2 id="com-goal-title">{d.goal}</h2>
          {k.target !== null && (
            <strong>
              {f.euros(k.caMonth)} / {f.euros(k.target)} ({k.progress ?? 0}%)
            </strong>
          )}
        </header>
        {k.target === null ? (
          <p className="adm-empty">{d.noTarget}</p>
        ) : (
          <div
            className="com-goal-bar"
            role="progressbar"
            aria-labelledby="com-goal-title"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, k.progress ?? 0)}
          >
            <span style={{ width: `${Math.min(100, k.progress ?? 0)}%` }} />
          </div>
        )}
      </section>

      <div className="com-widgets">
        <section className="adm-card" id="devis-a-relancer" aria-labelledby="com-quotes-title">
          <header className="adm-card-head">
            <h2 id="com-quotes-title">
              <FileClock size={17} aria-hidden="true" />
              {d.quotes.title}
            </h2>
          </header>
          {data.quotes.total === 0 ? (
            <p className="adm-empty">{d.quotes.empty}</p>
          ) : (
            <>
              <p className="com-widget-sub">{d.quotes.summary(data.quotes.total, data.quotes.toFollowUp)}</p>
              <ul className="adm-list">
                {data.quotes.items.map((q) => (
                  <li key={q.id} className={q.ageDays >= FOLLOW_UP_AFTER_DAYS ? "is-overdue" : undefined}>
                    <FileClock size={16} aria-hidden="true" />
                    <span className="adm-stack">
                      <strong>{q.client}</strong>
                      <span className="adm-person-mail">
                        {q.reference} · {f.euros(q.totalCents)} · {t.statuses[q.status] ?? q.status} · {d.quotes.age(q.ageDays)}
                      </span>
                    </span>
                    {q.ageDays >= FOLLOW_UP_AFTER_DAYS && <span className="adm-badge is-warn">{d.quotes.late}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="adm-card" id="rendez-vous" aria-labelledby="com-rdv-title">
          <header className="adm-card-head">
            <h2 id="com-rdv-title">
              <CalendarClock size={17} aria-hidden="true" />
              {d.appointments.title}
            </h2>
          </header>
          {!data.tasksReady ? (
            <p className="adm-empty">{d.tasksUnavailable}</p>
          ) : data.appointments.length === 0 ? (
            <p className="adm-empty">{d.appointments.empty}</p>
          ) : (
            <ul className="adm-list">
              {data.appointments.map((a) => (
                <li key={a.id}>
                  {a.type === "appel" ? <Phone size={16} aria-hidden="true" /> : <CalendarClock size={16} aria-hidden="true" />}
                  <span className="adm-stack">
                    <strong>{a.title}</strong>
                    <span className="adm-person-mail">
                      {t.kinds[a.type] ?? a.type} · {when(a.dueAt)}
                      {a.notes ? ` · ${a.notes}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card" id="taches-du-jour" aria-labelledby="com-today-title">
          <header className="adm-card-head">
            <h2 id="com-today-title">
              <ClipboardList size={17} aria-hidden="true" />
              {d.today.title}
            </h2>
          </header>
          {!data.tasksReady ? (
            <p className="adm-empty">{d.tasksUnavailable}</p>
          ) : data.today.length === 0 ? (
            <p className="adm-empty">{d.today.empty}</p>
          ) : (
            <>
              <ul className="adm-list">
                {data.today.map((task) => (
                  <li key={task.id} className={task.overdue ? "is-overdue" : undefined}>
                    <ClipboardList size={16} aria-hidden="true" />
                    <span className="adm-stack">
                      <strong>{task.title}</strong>
                      <span className="adm-person-mail">
                        {t.kinds[task.type] ?? task.type} · {task.overdue ? `${d.today.overdue} · ${when(task.dueAt)}` : time(task.dueAt)}
                      </span>
                    </span>
                    <TaskActions id={task.id} title={task.title} done={false} canDelete={false} />
                  </li>
                ))}
              </ul>
              {data.todayTotal > data.today.length && <p className="com-widget-sub">{d.today.more(data.todayTotal - data.today.length)}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
