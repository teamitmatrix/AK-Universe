import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { FEEDBACK_LABEL, FeedbackStatusSelect, type FeedbackStatus } from "@/components/videaste/FeedbackStatusSelect";
import { Dot, StageBadge, deadlineText } from "@/components/videaste/vidUi";
import { dateTimeFr, nextDayKey } from "@/lib/commercial/time";
import { loadMyFeedback } from "@/lib/videaste/projects";
import { requireVideaste } from "@/lib/videaste/session";

/*
 * videaste/retours-clients.html (handoff page 08): only the projects where the client asked for changes — each
 * feedback with its comment, the version it is about, the deadline and a quick status selector
 * (À traiter / En cours / Corrigé). Feedback rows are written when an admin records the client's answer.
 */

const TABS: { id: "" | FeedbackStatus; label: string }[] = [
  { id: "", label: "Tous" },
  { id: "a_traiter", label: FEEDBACK_LABEL.a_traiter },
  { id: "en_cours", label: FEEDBACK_LABEL.en_cours },
  { id: "corrige", label: FEEDBACK_LABEL.corrige },
];

export default async function RetoursClientsPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const me = await requireVideaste("/videaste/retours-clients");
  const [{ filtre }, data] = await Promise.all([searchParams, loadMyFeedback(me)]);
  const tab = TABS.some((t) => t.id === filtre) ? (filtre as FeedbackStatus) : "";
  const shown = data.items.filter((f) => !tab || f.status === tab);

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Retours clients</h2>
          <p>Uniquement les projets pour lesquels une modification a été demandée.</p>
        </div>
      </div>
      {!data.ready ? (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Les retours clients seront disponibles après l&apos;application de la migration 013.
        </p>
      ) : (
        <>
          <nav className="vid-tabs" aria-label="Filtrer les retours">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <Link
                  key={t.id || "tous"}
                  href={t.id ? `/videaste/retours-clients?filtre=${t.id}` : "/videaste/retours-clients"}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                  scroll={false}
                >
                  {t.label}
                  <small>{data.items.filter((f) => !t.id || f.status === t.id).length}</small>
                </Link>
              );
            })}
          </nav>
          {shown.length === 0 ? (
            <p className="adm-empty vid-empty-card">{data.items.length === 0 ? "Aucune modification demandée par vos clients." : "Aucun retour dans cette catégorie."}</p>
          ) : (
            <ul className="vid-feedbacks">
              {shown.map((f) => (
                <li key={f.id} className={`adm-card vid-feedback${f.status === "corrige" ? " is-done" : ""}`}>
                  <header>
                    <span className="adm-stack">
                      <strong>{f.project.title}</strong>
                      <span className="adm-person-mail">
                        {f.project.client}
                        {f.version ? ` · ${f.version}` : ""}
                      </span>
                    </span>
                    <StageBadge stage={f.project.stage} />
                    <FeedbackStatusSelect id={f.id} status={f.status} label={f.project.title} />
                  </header>
                  <blockquote>{f.comment}</blockquote>
                  <footer>
                    <span>Reçu le {dateTimeFr(f.created_at)}</span>
                    <span className="vid-deadline">
                      <Dot urgency={f.status === "corrige" ? "done" : f.project.urgency} />
                      Deadline : {deadlineText(f.deadline ?? f.project.deadline, f.project.urgency, data.todayKey, nextDayKey(data.todayKey))}
                    </span>
                    <Link href={`/videaste/projet?id=${f.project.id}`} className="adm-link">
                      Ouvrir le projet <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </footer>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
