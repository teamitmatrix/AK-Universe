import Link from "next/link";
import { CalendarDays, Info, ListChecks } from "lucide-react";
import { CreateEventButton, DeleteEventButton, EditEventButton } from "@/components/videaste/AgendaClient";
import { TaskStateSelect } from "@/components/videaste/TaskStateSelect";
import { Dot, dayName } from "@/components/videaste/vidUi";
import { nextDayKey, timeFr } from "@/lib/commercial/time";
import { VID_EVENT_TYPES, loadMyAgenda } from "@/lib/videaste/agenda";
import { requireVideaste } from "@/lib/videaste/session";

/*
 * videaste/agenda.html (handoff page 08): shoots, client meetings, team meetings, reviews, deliveries and project
 * deadlines grouped by day, with the videographer's tasks in a side panel. Only their own rows (requireVideaste + RLS).
 * Event colours are type tags; red stays reserved for overdue / due-today deadlines.
 */

const PRIORITY: Record<string, string> = { haute: "Haute", normale: "Moyenne", basse: "Basse" };

export default async function AgendaPage() {
  const me = await requireVideaste("/videaste/agenda");
  const data = await loadMyAgenda(me);
  const tomorrowKey = nextDayKey(data.todayKey);

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Agenda</h2>
          <p>Tournages, RDV clients, deadlines, réunions, livraisons et tâches.</p>
        </div>
        {data.eventsReady && <CreateEventButton projects={data.projects} />}
      </div>
      {!data.eventsReady && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          La création d&apos;événements sera disponible après l&apos;application de la migration 013. Les deadlines de vos projets sont déjà affichées.
        </p>
      )}

      <div className="vid-agenda">
        <section className="adm-card" aria-labelledby="vid-cal-h">
          <header className="adm-card-head">
            <h2 id="vid-cal-h">
              <CalendarDays size={17} aria-hidden="true" />
              Prochains jours
            </h2>
          </header>
          {data.days.length === 0 ? (
            <p className="adm-empty">Rien de prévu pour les 60 prochains jours.</p>
          ) : (
            data.days.map((day) => (
              <div key={day.key} className="vid-day">
                <h3>{dayName(day.key, data.todayKey, tomorrowKey)}</h3>
                <ul className="vid-events">
                  {day.items.map((e) => (
                    <li key={e.id}>
                      <span className="vid-event-time">{e.startsAt ? timeFr(e.startsAt) : "Journée"}</span>
                      <span className={`vid-type is-${e.type}${e.type === "deadline" && e.urgency === "late" ? " is-late" : ""}`}>{VID_EVENT_TYPES[e.type]}</span>
                      <span className="adm-stack">
                        <strong>
                          {e.type === "deadline" && <Dot urgency={e.urgency} />} {e.title}
                        </strong>
                        <span className="adm-person-mail">
                          {[e.projectLabel, e.location, e.durationMinutes ? `${e.durationMinutes} min` : null, e.notes].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {e.source === "deadline" && e.projectId ? (
                        <Link href={`/videaste/projet?id=${e.projectId}`} className="adm-link">
                          Projet
                        </Link>
                      ) : e.startsAt ? (
                        <span className="vid-event-actions">
                          <EditEventButton
                            event={{
                              id: e.id,
                              title: e.title,
                              type: e.type,
                              startsAt: e.startsAt,
                              durationMinutes: e.durationMinutes,
                              projectId: e.projectId,
                              location: e.location,
                              notes: e.notes,
                            }}
                            projects={data.projects}
                          />
                          <DeleteEventButton id={e.id} title={e.title} />
                        </span>
                      ) : (
                        <DeleteEventButton id={e.id} title={e.title} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <aside className="adm-card" aria-labelledby="vid-agenda-tasks-h">
          <header className="adm-card-head">
            <h2 id="vid-agenda-tasks-h">
              <ListChecks size={17} aria-hidden="true" />
              Mes tâches
            </h2>
          </header>
          {data.tasks.length === 0 ? (
            <p className="adm-empty">Aucune tâche ouverte.</p>
          ) : (
            <ul className="adm-list vid-tasks">
              {data.tasks.map((t) => (
                <li key={t.id}>
                  <Dot urgency={t.urgency} />
                  <span className="adm-stack">
                    <strong>{t.title}</strong>
                    <span className="adm-person-mail">
                      {t.context ? `${t.context} · ` : ""}
                      {t.dueKey < data.todayKey ? `En retard · ${dayName(t.dueKey, data.todayKey)}` : `${dayName(t.dueKey, data.todayKey, tomorrowKey)} · ${timeFr(t.dueAt)}`}
                    </span>
                  </span>
                  <span className={`vid-prio is-${t.priority}`}>{PRIORITY[t.priority]}</span>
                  <TaskStateSelect id={t.id} title={t.title} state={t.state} progressReady={data.progressReady} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      <p className="vid-hint">
        <Info size={13} aria-hidden="true" />
        Synchronisation Google Agenda / Outlook : non disponible pour le moment.
      </p>
    </div>
  );
}
