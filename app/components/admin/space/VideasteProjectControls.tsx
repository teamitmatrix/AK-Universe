"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, MessageSquareWarning, X } from "lucide-react";
import { reassignProjectVideaste, respondToVersion, setProjectStageAdmin } from "@/lib/admin/videaste-actions";
import type { PendingVersion } from "@/lib/admin/projects";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/videaste/stages";
import { PROVIDERS } from "@/lib/videaste/storage";

/*
 * Inline controls of the admin project table (Espace Vidéaste handoff, page 10). They only call server actions,
 * which re-check the admin role and validate everything; the database re-checks again. Hiding these controls from
 * other roles is not the security — the server is.
 */

const ERRORS: Record<string, string> = {
  forbidden: "Accès réservé aux administrateurs.",
  invalid: "Valeur invalide.",
  notFound: "Projet, version ou vidéaste introuvable (ou vidéaste désactivé).",
  transition: "Cette action n'est plus possible : la version a déjà reçu une réponse.",
  notReady: "Disponible après l'application de la migration 013.",
  commentRequired: "Décrivez les modifications demandées par le client.",
  failed: "L'opération a échoué. Réessayez.",
};

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ success: true } | { success: false; error: string }>, onFail?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.success) {
        onFail?.();
        setError(ERRORS[res.error] ?? ERRORS.failed);
        return;
      }
      router.refresh();
    });
  };
  return { error, pending, run };
}

export function ReassignSelect({ projectId, value, videastes, label }: { projectId: string; value: string | null; videastes: { id: string; name: string; active: boolean }[]; label: string }) {
  const [current, setCurrent] = useState(value ?? "");
  const { error, pending, run } = useAction();
  return (
    <span className="adm-inline-ctl">
      <select
        className="adm-select sm"
        value={current}
        disabled={pending}
        aria-label={`Vidéaste assigné — ${label}`}
        onChange={(e) => {
          const previous = current;
          const next = e.target.value;
          setCurrent(next);
          run(() => reassignProjectVideaste(projectId, next || null), () => setCurrent(previous));
        }}
      >
        <option value="">— Non assigné —</option>
        {videastes.map((v) => (
          // An inactive videographer cannot receive a project; still shown if currently assigned.
          <option key={v.id} value={v.id} disabled={!v.active && v.id !== value}>
            {v.active ? v.name : `${v.name} (inactif)`}
          </option>
        ))}
      </select>
      {error && (
        <small className="adm-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}

export function AdminStageSelect({ projectId, stage, label }: { projectId: string; stage: Stage; label: string }) {
  const [current, setCurrent] = useState(stage);
  const { error, pending, run } = useAction();
  return (
    <span className="adm-inline-ctl">
      <select
        className="adm-select sm"
        value={current}
        disabled={pending}
        aria-label={`Étape — ${label}`}
        onChange={(e) => {
          const previous = current;
          const next = e.target.value as Stage;
          setCurrent(next);
          run(() => setProjectStageAdmin(projectId, next), () => setCurrent(previous));
        }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      {error && (
        <small className="adm-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}

/** "Réponse du client": records validation or requested changes for the version sent by the videographer. */
export function VersionReviewButton({ version, project }: { version: PendingVersion; project: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [comment, setComment] = useState("");
  const { error, pending, run } = useAction();
  const name = version.label || `V${version.number}`;
  const answer = (decision: "validee" | "modifications") =>
    run(async () => {
      const res = await respondToVersion(version.id, decision, comment);
      if (res.success) {
        dialog.current?.close();
        setComment("");
      }
      return res;
    });

  return (
    <>
      <button type="button" className="adm-btn sm" onClick={() => dialog.current?.showModal()}>
        {name} à valider
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby={`adm-review-${version.id}`}>
        <div className="adm-modal-card">
          <header>
            <h2 id={`adm-review-${version.id}`}>Réponse du client — {name}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label="Fermer">
              <X size={18} />
            </button>
          </header>
          <p className="adm-muted">
            {project}. Enregistrez ici la réponse du client sur la version envoyée par le vidéaste (le vidéaste ne peut pas la valider lui-même).
          </p>
          <a href={version.url} target="_blank" rel="noopener noreferrer nofollow" className="adm-btn is-ghost">
            <ExternalLink size={15} aria-hidden="true" /> Voir la vidéo sur {PROVIDERS[version.provider] ?? "le stockage"}
          </a>
          {version.notes && <p className="adm-small">Note du vidéaste : {version.notes}</p>}
          <label className="adm-field">
            <span>Commentaire du client (obligatoire pour des modifications)</span>
            <textarea rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Changer la musique, raccourcir l'intro…" />
          </label>
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" disabled={pending} onClick={() => answer("modifications")}>
              <MessageSquareWarning size={15} aria-hidden="true" /> Demander des modifications
            </button>
            <button type="button" className="adm-btn" disabled={pending} onClick={() => answer("validee")}>
              <CheckCircle2 size={15} aria-hidden="true" /> Valider
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** "Projets en retard uniquement" checkbox: a URL filter, like the other selects of the toolbar. */
export function LateOnlyToggle({ checked }: { checked: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <label className={`adm-check${pending ? " is-pending" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.delete("statut");
          if (e.target.checked) next.set("retard", "1");
          else next.delete("retard");
          if (params.get("statut") && params.get("statut") !== "retard") next.set("statut", params.get("statut")!);
          start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
        }}
      />
      Projets en retard uniquement
    </label>
  );
}
