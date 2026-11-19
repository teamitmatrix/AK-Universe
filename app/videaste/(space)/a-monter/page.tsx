import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { StartEditingButton } from "@/components/videaste/StartEditingButton";
import { ProjectCard } from "@/components/videaste/vidUi";
import { nextDayKey } from "@/lib/commercial/time";
import { loadMyProjects, type MyProject } from "@/lib/videaste/projects";
import { requireVideaste } from "@/lib/videaste/session";
import { daysBetween } from "@/lib/videaste/stages";

/*
 * videaste/a-monter.html (handoff page 08): ONLY the videos still needing edit work (brief received, shooting,
 * editing, changes requested), each with a priority tag and "Commencer" / "Continuer" — nothing else.
 * Priority is not a separate field: it follows the deadline (and a pending client change), so it can never disagree
 * with the dates shown — Haute: changes requested, overdue or due within 3 days · Moyenne: within 7 days · Basse: later.
 */

const TO_EDIT = new Set(["brief_recu", "tournage", "montage", "modifications"]);
type Priority = "haute" | "normale" | "basse";
const PRIORITY_LABEL: Record<Priority, string> = { haute: "Haute", normale: "Moyenne", basse: "Basse" };

function priorityOf(p: MyProject, todayKey: string): Priority {
  if (p.stage === "modifications" || p.urgency === "late" || p.urgency === "soon") return "haute";
  if (p.deadline && daysBetween(todayKey, p.deadline) <= 7) return "normale";
  return "basse";
}
const RANK: Record<Priority, number> = { haute: 0, normale: 1, basse: 2 };

export default async function AMonterPage() {
  const me = await requireVideaste("/videaste/a-monter");
  const { projects, todayKey, stagesReady } = await loadMyProjects(me);
  const items = projects
    .filter((p) => TO_EDIT.has(p.stage))
    .map((p) => ({ p, priority: priorityOf(p, todayKey) }))
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || (a.p.deadline ?? "9999").localeCompare(b.p.deadline ?? "9999"));

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>À monter</h2>
          <p>Les vidéos qui attendent votre travail de montage — rien d&apos;autre.</p>
        </div>
      </div>
      <p className="vid-hint">
        <Info size={13} aria-hidden="true" />
        Priorité selon la deadline : Haute = modifications demandées, en retard ou sous 3 jours · Moyenne = sous 7 jours · Basse = plus tard.
      </p>
      {items.length === 0 ? (
        <p className="adm-empty vid-empty-card">Aucune vidéo à monter. Bravo, tout est à jour !</p>
      ) : (
        <ul className="vid-cards">
          {items.map(({ p, priority }) => (
            <ProjectCard
              key={p.id}
              p={p}
              todayKey={todayKey}
              tomorrowKey={nextDayKey(todayKey)}
              tag={<span className={`vid-prio is-${priority}`}>{PRIORITY_LABEL[priority]}</span>}
              footer={
                stagesReady && (p.stage === "brief_recu" || p.stage === "tournage") ? (
                  <StartEditingButton projectId={p.id} title={p.title} />
                ) : (
                  <Link href={`/videaste/projet?id=${p.id}`} className="adm-btn is-ghost sm vid-card-open">
                    <ArrowRight size={14} aria-hidden="true" /> Continuer
                  </Link>
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
