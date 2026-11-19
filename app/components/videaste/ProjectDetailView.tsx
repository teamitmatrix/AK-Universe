import Link from "next/link";
import { ArrowRight, ClipboardList, Info, Megaphone, MessageSquare, MousePointerClick, Sparkles, Target, Users, BookOpen, StickyNote } from "lucide-react";
import { dateTimeFr, nextDayKey } from "@/lib/commercial/time";
import type { MyProjectDetail } from "@/lib/videaste/projects";
import { STAGE_LABEL } from "@/lib/videaste/stages";
import { BriefEditor } from "./BriefEditor";
import { FEEDBACK_LABEL, FeedbackStatusSelect } from "./FeedbackStatusSelect";
import { FilesPanel } from "./FilesPanel";
import { StageSelect } from "./StageSelect";
import { VersionsPanel } from "./VersionsPanel";
import { Dot, StageBadge, deadlineText } from "./vidUi";

/*
 * videaste/projet?id= (handoff page 07): the whole working loop on one page — read the structured brief, open the
 * files on their existing storage, add a version, send it for validation, follow the client's feedback — without
 * re-entering anything already on file. The "Valider / Demander des modifications" demo panel of the prototype is
 * intentionally NOT here: in production that answer is recorded from the admin space, never by the videographer.
 */

const BRIEF_ROWS = [
  { key: "audience", label: "Audience", Icon: Users },
  { key: "style", label: "Style souhaité", Icon: Sparkles },
  { key: "style_references", label: "Références", Icon: BookOpen },
] as const;

export function ProjectDetailView({ data }: { data: MyProjectDetail }) {
  const { project: p, brief, request, todayKey } = data;
  const delivered = p.stage === "livre";
  const spec = [
    { label: "Type de vidéo", value: brief?.video_type || p.services[0] || null },
    { label: "Durée attendue", value: brief?.duration },
    { label: "Format", value: brief?.format },
    { label: "Résolution", value: brief?.resolution },
    { label: "Nombre de vidéos", value: brief?.video_count != null ? String(brief.video_count) : null },
    { label: "Versions", value: String(data.versions.length) },
    { label: "Plateforme", value: brief?.platform },
  ];
  const openFeedback = data.feedback.filter((f) => f.status !== "corrige");

  return (
    <div className="adm-content">
      <nav className="adm-crumbs" aria-label="Fil d'Ariane">
        <Link href="/videaste/mes-projets">Mes projets</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{p.title}</span>
      </nav>

      <div className="adm-pagehead vid-project-head">
        <div>
          <h2>{p.title}</h2>
          <p>
            {p.client} · {p.reference}
          </p>
        </div>
        <div className="vid-project-head-side">
          {data.stagesReady ? <StageSelect projectId={p.id} stage={p.stage} title={p.title} /> : <StageBadge stage={p.stage} />}
          <span className="vid-deadline">
            <Dot urgency={p.urgency} />
            Échéance : <strong>{deadlineText(p.deadline, p.urgency, todayKey, nextDayKey(todayKey))}</strong>
          </span>
        </div>
      </div>

      <div className="vid-progress">
        <div className="vid-bar" role="progressbar" aria-label="Progression du projet" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.progress}>
          <span style={{ width: `${p.progress}%` }} />
        </div>
        <span>
          Progression · {STAGE_LABEL[p.stage]} · {p.progress}%
        </span>
      </div>

      {!data.workspaceReady && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Le brief structuré, les fichiers liés et les versions seront disponibles après l&apos;application de la migration 013. La demande d&apos;origine du client est affichée
          ci-dessous.
        </p>
      )}

      <dl className="vid-spec">
        {spec.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value || "—"}</dd>
          </div>
        ))}
      </dl>

      <section className="adm-card" aria-labelledby="vid-brief-h">
        <header className="adm-card-head">
          <h2 id="vid-brief-h">
            <ClipboardList size={17} aria-hidden="true" />
            Brief client
          </h2>
          {data.workspaceReady && (
            <BriefEditor
              projectId={p.id}
              brief={brief}
              defaults={{ video_type: p.services[0] ?? "", extra_notes: request.message ?? "", video_count: request.items.length > 1 ? String(request.items.length) : "" }}
            />
          )}
        </header>
        {brief && (brief.objective || brief.main_message || brief.audience || brief.style || brief.style_references || brief.call_to_action || brief.extra_notes) ? (
          <div className="vid-brief">
            {brief.objective && (
              <div className="vid-brief-block">
                <h3>
                  <Target size={13} aria-hidden="true" /> Objectif
                </h3>
                <p>{brief.objective}</p>
              </div>
            )}
            <div className="vid-brief-grid">
              {brief.main_message && (
                <div className="vid-brief-block">
                  <h3>
                    <Megaphone size={13} aria-hidden="true" /> Message principal
                  </h3>
                  <p>{brief.main_message}</p>
                </div>
              )}
              {BRIEF_ROWS.map(({ key, label, Icon }) =>
                brief[key] ? (
                  <div key={key} className="vid-brief-block">
                    <h3>
                      <Icon size={13} aria-hidden="true" /> {label}
                    </h3>
                    <p>{brief[key]}</p>
                  </div>
                ) : null,
              )}
            </div>
            {brief.call_to_action && (
              <div className="vid-brief-block">
                <h3>
                  <MousePointerClick size={13} aria-hidden="true" /> Appel à l&apos;action
                </h3>
                <p>{brief.call_to_action}</p>
              </div>
            )}
            {brief.extra_notes && (
              <div className="vid-brief-block">
                <h3>
                  <StickyNote size={13} aria-hidden="true" /> Informations complémentaires
                </h3>
                <p>{brief.extra_notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="vid-brief">
            <p className="adm-muted adm-small">Brief pas encore structuré — voici la demande envoyée par le client depuis le site :</p>
            {request.items.length > 0 && (
              <div className="vid-brief-block">
                <h3>
                  <ClipboardList size={13} aria-hidden="true" /> Prestations demandées
                </h3>
                <ul className="vid-request-items">
                  {request.items.map((i, n) => (
                    <li key={n}>
                      <strong>{i.service}</strong>
                      {i.details ? ` — ${i.details}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="vid-brief-grid">
              {request.place && (
                <div className="vid-brief-block">
                  <h3>Lieu</h3>
                  <p>{request.place}</p>
                </div>
              )}
              {request.wishedDate && (
                <div className="vid-brief-block">
                  <h3>Date souhaitée</h3>
                  <p>{request.wishedDate.split("-").reverse().join("/")}</p>
                </div>
              )}
            </div>
            {request.message && (
              <div className="vid-brief-block">
                <h3>
                  <StickyNote size={13} aria-hidden="true" /> Message du client
                </h3>
                <p>{request.message}</p>
              </div>
            )}
            {!request.items.length && !request.message && <p className="adm-empty">Aucun détail fourni par le client.</p>}
          </div>
        )}
      </section>

      {data.workspaceReady && (
        <>
          <FilesPanel projectId={p.id} files={data.files} meId={data.meId} />
          <VersionsPanel projectId={p.id} versions={data.versions} meId={data.meId} delivered={delivered} />
          <section className="adm-card" aria-labelledby="vid-fb-h">
            <header className="adm-card-head">
              <h2 id="vid-fb-h">
                <MessageSquare size={17} aria-hidden="true" />
                Retours client
              </h2>
              {openFeedback.length > 0 && <span className="vid-count">{openFeedback.length} à traiter</span>}
            </header>
            {data.feedback.length === 0 ? (
              <p className="adm-empty">Aucun retour client sur ce projet.</p>
            ) : (
              <ul className="adm-list vid-feedback-list">
                {data.feedback.map((f) => (
                  <li key={f.id} className={f.status === "corrige" ? "is-done" : undefined}>
                    <Dot urgency={f.status === "corrige" ? "done" : "none"} />
                    <span className="adm-stack">
                      <strong className="vid-feedback-text">{f.comment}</strong>
                      <span className="adm-person-mail">
                        Reçu le {dateTimeFr(f.created_at)} · {FEEDBACK_LABEL[f.status]}
                      </span>
                    </span>
                    <FeedbackStatusSelect id={f.id} status={f.status} label={f.comment.slice(0, 40)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p>
        <Link href="/videaste/mes-projets" className="adm-link">
          <ArrowRight size={13} aria-hidden="true" style={{ transform: "rotate(180deg)" }} /> Retour à mes projets
        </Link>
      </p>
    </div>
  );
}
