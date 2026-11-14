import Link from "next/link";
import { CalendarCheck, CircleCheck, Clapperboard, Clock, Film, Info, ListChecks, MessageSquare } from "lucide-react";
import { Kpi } from "@/components/admin/space/ui";
import { dayLabelFr, timeFr } from "@/lib/commercial/time";
import type { VideasteDashboard } from "@/lib/videaste/dashboard";
import { videasteHref } from "@/lib/videaste/nav";
import { TaskStateSelect } from "./TaskStateSelect";
import { Dot, ProjectCard, StageBadge, dayName as dayNameOf } from "./vidUi";

/*
 * videaste/dashboard (handoff page 05): greeting, 4 KPI tiles and nothing else by way of statistics (no charts),
 * then "À faire aujourd'hui" + "Prochaines deadlines" above the fold, then the active project cards.
 * Deadline colours follow one rule only: red = overdue / today, orange = within 3 days, green = done.
 */

const PRIORITY: Record<string, string> = { haute: "Haute", normale: "Moyenne", basse: "Basse" };

export function VideasteDashboardView({ data }: { data: VideasteDashboard }) {
  const { kpis, todayKey, tomorrowKey } = data;
  const dayName = (key: string) => dayNameOf(key, todayKey, tomorrowKey);
  const projectsHref = videasteHref("projets");
  const todayLabel = dayLabelFr(todayKey);

  return (
    <div className="adm-content vid-dash">
      <div className="adm-pagehead">
        <div>
          <h2>Bonjour {data.firstName}</h2>
          <p>
            Voici ce qui vous attend aujourd&apos;hui — <span className="vid-today">{todayLabel}</span>.
          </p>
        </div>
      </div>

      <div className="adm-kpis vid-kpis">
        <Kpi Icon={Film} label="Projets en cours" hint="Projets qui vous sont attribués et pas encore livrés." value={String(kpis.inProgress)} />
        <Kpi Icon={Clock} label="À livrer cette semaine" hint="Projets en cours dont la deadline tombe d'ici dimanche (retards inclus)." value={String(kpis.dueThisWeek)} />
        <Kpi
          Icon={MessageSquare}
          label="Retours clients à traiter"
          hint={data.stagesReady ? "Projets à l'étape « Modifications »." : "Projets en cours avec au moins un tour de modifications demandé."}
          value={String(kpis.toRevise)}
          hero={kpis.toRevise > 0}
        />
        <Kpi Icon={CircleCheck} label="Projets terminés ce mois" hint="Projets passés à « Livré » ce mois-ci." value={String(kpis.deliveredMonth)} />
      </div>

      {!data.stagesReady && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Les étapes de production (Tournage, Montage, À faire valider…) seront suivies après l&apos;application de la migration 013 — en attendant,
          l&apos;étape affichée est déduite du statut du projet.
        </p>
      )}

      <div className="vid-top">
        <section className="adm-card" aria-labelledby="vid-today-title">
          <header className="adm-card-head">
            <h2 id="vid-today-title">
              <ListChecks size={17} aria-hidden="true" />
              À faire aujourd&apos;hui
            </h2>
            {data.tasksReady && data.tasks.length > 0 && (
              <span className="vid-count">
                {data.openTasks} restante{data.openTasks > 1 ? "s" : ""}
              </span>
            )}
          </header>
          {!data.tasksReady ? (
            <p className="adm-empty">Les tâches ne sont pas disponibles pour le moment.</p>
          ) : data.tasks.length === 0 ? (
            <p className="adm-empty">Rien de prévu aujourd&apos;hui. Les tâches que l&apos;équipe vous attribue apparaîtront ici.</p>
          ) : (
            <ul className="adm-list vid-tasks">
              {data.tasks.map((task) => (
                <li key={task.id} className={task.state === "fait" ? "is-done" : undefined}>
                  <Dot urgency={task.urgency} />
                  <span className="adm-stack">
                    <strong>{task.title}</strong>
                    <span className="adm-person-mail">
                      {task.context ? `${task.context} · ` : ""}
                      {task.state === "fait" ? "Fait aujourd'hui" : task.overdue ? `En retard · ${dayName(task.dueKey)}` : `Aujourd'hui · ${timeFr(task.dueAt)}`}
                    </span>
                  </span>
                  <span className={`vid-prio is-${task.priority}`}>{PRIORITY[task.priority]}</span>
                  <TaskStateSelect id={task.id} title={task.title} state={task.state} progressReady={data.progressReady} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card" aria-labelledby="vid-deadlines-title">
          <header className="adm-card-head">
            <h2 id="vid-deadlines-title">
              <CalendarCheck size={17} aria-hidden="true" />
              Prochaines deadlines
            </h2>
            {projectsHref && (
              <Link href={projectsHref} className="adm-link">
                Tous les projets
              </Link>
            )}
          </header>
          {data.deadlineGroups.length === 0 ? (
            <p className="adm-empty">Aucune deadline à venir sur vos projets.</p>
          ) : (
            <div className="vid-deadlines">
              {data.deadlineGroups.map((g) => (
                <div key={g.key} className="vid-day">
                  <h3 className={g.key === "late" ? "is-late" : undefined}>{g.label || dayName(g.key)}</h3>
                  <ul className="adm-list">
                    {g.items.map((p) => (
                      <li key={p.id}>
                        <Dot urgency={p.urgency} />
                        <span className="adm-stack">
                          <strong>{p.title}</strong>
                          <span className="adm-person-mail">
                            {p.client} · {p.reference}
                            {g.key === "late" && p.deadline ? ` · prévu ${dayName(p.deadline)}` : ""}
                          </span>
                        </span>
                        <StageBadge stage={p.stage} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="adm-card" aria-labelledby="vid-cards-title">
        <header className="adm-card-head">
          <h2 id="vid-cards-title">
            <Clapperboard size={17} aria-hidden="true" />
            Mes projets en cours
          </h2>
          {projectsHref && data.activeTotal > data.cards.length && (
            <Link href={projectsHref} className="adm-link">
              Voir tout ({data.activeTotal})
            </Link>
          )}
        </header>
        {data.cards.length === 0 ? (
          <p className="adm-empty">Aucun projet en cours. Les projets que l&apos;administration vous attribue apparaîtront ici.</p>
        ) : (
          <ul className="vid-cards">
            {data.cards.map((p) => (
              <ProjectCard key={p.id} p={p} todayKey={todayKey} tomorrowKey={tomorrowKey} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
