"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { saveBrief, type BriefInput } from "@/lib/videaste/project-actions";
import type { Brief } from "@/lib/videaste/projects";
import { VID_ERRORS } from "./vidUi";

const FIELDS: { key: keyof BriefInput; label: string; max: number; area?: boolean; group: "brief" | "spec" }[] = [
  { key: "objective", label: "Objectif", max: 1000, area: true, group: "brief" },
  { key: "main_message", label: "Message principal", max: 1000, area: true, group: "brief" },
  { key: "audience", label: "Audience", max: 500, group: "brief" },
  { key: "style", label: "Style souhaité", max: 500, group: "brief" },
  { key: "style_references", label: "Références", max: 1000, area: true, group: "brief" },
  { key: "call_to_action", label: "Appel à l'action", max: 300, group: "brief" },
  { key: "extra_notes", label: "Informations complémentaires", max: 2000, area: true, group: "brief" },
  { key: "video_type", label: "Type de vidéo", max: 80, group: "spec" },
  { key: "duration", label: "Durée attendue", max: 40, group: "spec" },
  { key: "format", label: "Format (ex. 9:16)", max: 40, group: "spec" },
  { key: "resolution", label: "Résolution", max: 40, group: "spec" },
  { key: "video_count", label: "Nombre de vidéos", max: 3, group: "spec" },
  { key: "platform", label: "Plateforme", max: 80, group: "spec" },
];

/** "Modifier le brief": the structured client brief + technical spec, saved on the server (saveBrief). */
export function BriefEditor({ projectId, brief, defaults }: { projectId: string; brief: Brief | null; defaults: Partial<BriefInput> }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const initial = () =>
    Object.fromEntries(FIELDS.map((f) => [f.key, brief?.[f.key] != null ? String(brief[f.key]) : (defaults[f.key] ?? "")])) as BriefInput;
  const [values, setValues] = useState<BriefInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveBrief(projectId, values);
      if (!res.success) return setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      dialog.current?.close();
      router.refresh();
    });
  }

  const field = (f: (typeof FIELDS)[number]) => (
    <label key={f.key} className={`adm-field${f.area ? " vid-span-2" : ""}`}>
      <span>{f.label}</span>
      {f.area ? (
        <textarea rows={3} maxLength={f.max} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
      ) : (
        <input
          inputMode={f.key === "video_count" ? "numeric" : undefined}
          maxLength={f.max}
          value={values[f.key]}
          onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
        />
      )}
    </label>
  );

  return (
    <>
      <button
        type="button"
        className="adm-btn is-ghost sm"
        onClick={() => {
          setValues(initial());
          setError(null);
          dialog.current?.showModal();
        }}
      >
        <Pencil size={14} aria-hidden="true" /> {brief ? "Modifier le brief" : "Compléter le brief"}
      </button>
      <dialog ref={dialog} className="adm-modal vid-modal" aria-labelledby="vid-brief-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="vid-brief-title">Brief client</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label="Fermer">
              <X size={18} />
            </button>
          </header>
          <h3 className="vid-form-head">Brief</h3>
          <div className="vid-form-grid">{FIELDS.filter((f) => f.group === "brief").map(field)}</div>
          <h3 className="vid-form-head">Fiche technique</h3>
          <div className="vid-form-grid">{FIELDS.filter((f) => f.group === "spec").map(field)}</div>
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              Annuler
            </button>
            <button type="submit" className="adm-btn" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
