import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { dayLabelFr } from "@/lib/commercial/time";
import { STAGE_LABEL, STAGE_TONE, type Stage, type Urgency } from "@/lib/videaste/stages";

/** Shared display pieces of the Videographer space (server-safe: no hooks). */

export const VID_ERRORS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid: "Vérifiez les champs du formulaire.",
  notFound: "Élément introuvable ou non attribué à votre compte.",
  transition: "Ce changement d'étape n'est pas autorisé depuis votre espace.",
  notReady: "Cette fonction sera disponible après l'application de la migration 013.",
  failed: "L'opération a échoué. Réessayez.",
};

const URGENCY_TEXT: Record<Urgency, string> = { late: "En retard ou dû aujourd'hui", soon: "Échéance dans les 3 jours", done: "Terminé", none: "" };

export function Dot({ urgency }: { urgency: Urgency }) {
  return <span className={`vid-dot is-${urgency}`} aria-hidden={urgency === "none" ? true : undefined} title={URGENCY_TEXT[urgency] || undefined} />;
}

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`adm-badge ${STAGE_TONE[stage]}`}>{STAGE_LABEL[stage]}</span>;
}

/** "Aujourd'hui", "Demain" or "6 novembre". */
export function dayName(key: string, todayKey: string, tomorrowKey?: string) {
  if (key === todayKey) return "Aujourd'hui";
  if (tomorrowKey && key === tomorrowKey) return "Demain";
  return dayLabelFr(key).replace(/^\S+\s/, "");
}

export function deadlineText(deadline: string | null, urgency: Urgency, todayKey: string, tomorrowKey?: string) {
  if (!deadline) return "Sans deadline";
  const name = dayName(deadline, todayKey, tomorrowKey);
  return urgency === "late" && deadline < todayKey ? `En retard · ${name}` : name;
}

export type CardProject = {
  id: string;
  reference: string;
  title: string;
  client: string;
  stage: Stage;
  deadline: string | null;
  urgency: Urgency;
  progress: number;
};

/** Visual project card (dashboard, Mes projets, À monter): thumbnail, type chip, stage, deadline, progress. */
export function ProjectCard({
  p,
  todayKey,
  tomorrowKey,
  tag,
  footer,
  link = true,
}: {
  p: CardProject;
  todayKey: string;
  tomorrowKey?: string;
  tag?: React.ReactNode;
  footer?: React.ReactNode;
  link?: boolean;
}) {
  return (
    <li className="vid-card">
      <div className="vid-thumb" aria-hidden="true">
        <span className="vid-chip">{p.reference}</span>
        <StageBadge stage={p.stage} />
        <span className="vid-play">
          <Play size={16} />
        </span>
      </div>
      <div className="vid-card-body">
        <strong>{p.title}</strong>
        <span className="vid-card-client">{p.client}</span>
        <span className="vid-sr">Étape : {STAGE_LABEL[p.stage]}.</span>
        <div className="vid-card-meta">
          <span>
            <Dot urgency={p.urgency} />
            {deadlineText(p.deadline, p.urgency, todayKey, tomorrowKey)}
          </span>
          {tag ?? <span>{p.progress}%</span>}
        </div>
        <div className="vid-bar" role="progressbar" aria-label={`Avancement de ${p.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.progress}>
          <span style={{ width: `${p.progress}%` }} />
        </div>
        {footer ??
          (link && (
            <Link href={`/videaste/projet?id=${p.id}`} className="adm-btn is-ghost sm vid-card-open">
              <ArrowRight size={14} aria-hidden="true" /> Ouvrir le projet
            </Link>
          ))}
      </div>
    </li>
  );
}
