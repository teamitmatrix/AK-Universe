"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ExternalLink, Layers, Plus, Send, Trash2, X } from "lucide-react";
import { addVersion, deleteVersion, sendVersion } from "@/lib/videaste/project-actions";
import type { ProjectVersion } from "@/lib/videaste/projects";
import { PROVIDERS, providerOf } from "@/lib/videaste/storage";
import { dateTimeFr } from "@/lib/commercial/time";
import { VID_ERRORS } from "./vidUi";

const STATUS: Record<ProjectVersion["status"], { label: string; tone: string }> = {
  brouillon: { label: "Brouillon", tone: "is-muted" },
  envoyee: { label: "Envoyée au client", tone: "is-warn" },
  validee: { label: "Validée", tone: "is-ok" },
  modifications: { label: "Modifications demandées", tone: "is-danger" },
};

/**
 * "Versions vidéo": history (V1, V2…), "Ajouter une version" (a link to the existing storage) and "Envoyer à
 * validation". The client's answer is NOT given here: it is recorded from the admin space (never from the
 * videographer's own session), and shows up on this list with the client's comment.
 */
export function VersionsPanel({ projectId, versions, meId, delivered }: { projectId: string; versions: ProjectVersion[]; meId: string; delivered: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ label: "", url: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const waiting = versions.some((v) => v.status === "envoyee");
  const detected = form.url ? providerOf(form.url) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!detected) return setError("Lien non reconnu : collez un lien https Google Drive, Dropbox, WeTransfer, Frame.io ou OneDrive.");
    start(async () => {
      const res = await addVersion(projectId, form);
      if (!res.success) return setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      dialog.current?.close();
      setForm({ label: "", url: "", notes: "" });
      router.refresh();
    });
  }

  function send(v: ProjectVersion) {
    const name = v.label || `V${v.number}`;
    if (!window.confirm(`Envoyer « ${name} » au client pour validation ? Le projet passera à « À faire valider ».`)) return;
    start(async () => {
      const res = await sendVersion(v.id);
      if (!res.success) return window.alert(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      router.refresh();
    });
  }

  function remove(v: ProjectVersion) {
    if (!window.confirm(`Supprimer le brouillon « ${v.label || `V${v.number}`} » ?`)) return;
    start(async () => {
      const res = await deleteVersion(v.id);
      if (!res.success) return window.alert(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      router.refresh();
    });
  }

  return (
    <section className="adm-card" aria-labelledby="vid-versions-title">
      <header className="adm-card-head">
        <h2 id="vid-versions-title">
          <Layers size={17} aria-hidden="true" />
          Versions vidéo
        </h2>
        {!delivered && (
          <button
            type="button"
            className="adm-btn is-ghost sm"
            onClick={() => {
              setError(null);
              dialog.current?.showModal();
            }}
          >
            <Plus size={14} aria-hidden="true" /> Ajouter une version
          </button>
        )}
      </header>
      {waiting && <p className="vid-hint">Une version attend la réponse du client : elle sera enregistrée par l&apos;équipe AK Universe dès réception.</p>}
      {versions.length === 0 ? (
        <p className="adm-empty">Aucune version pour le moment. Ajoutez le lien de votre premier export (V1).</p>
      ) : (
        <ol className="vid-versions">
          {versions.map((v) => (
            <li key={v.id}>
              <span className="vid-version-num">V{v.number}</span>
              <span className="adm-stack">
                <strong>
                  {v.label || `Version ${v.number}`}
                  <span className={`adm-badge ${STATUS[v.status].tone}`}>{STATUS[v.status].label}</span>
                </strong>
                <span className="adm-person-mail">
                  {PROVIDERS[v.provider]} · ajoutée le {dateTimeFr(v.created_at)}
                  {v.sent_at ? ` · envoyée le ${dateTimeFr(v.sent_at)}` : ""}
                </span>
                {v.notes && <span className="vid-version-note">{v.notes}</span>}
                {v.client_comment && (
                  <span className={`vid-version-comment${v.status === "modifications" ? " is-change" : ""}`}>
                    Client{v.responded_at ? ` (${dateTimeFr(v.responded_at)})` : ""} : {v.client_comment}
                  </span>
                )}
              </span>
              <span className="vid-version-actions">
                <a href={v.external_url} target="_blank" rel="noopener noreferrer nofollow" className="adm-icon-btn" aria-label={`Ouvrir V${v.number} sur ${PROVIDERS[v.provider]}`}>
                  <ExternalLink size={15} />
                </a>
                {v.status === "brouillon" && !delivered && (
                  <>
                    <button type="button" className="adm-btn sm" disabled={pending || waiting} onClick={() => send(v)} title={waiting ? "Une autre version attend déjà la réponse du client." : undefined}>
                      <Send size={14} aria-hidden="true" /> Envoyer à validation
                    </button>
                    {v.author_id === meId && (
                      <button type="button" className="adm-icon-btn" disabled={pending} onClick={() => remove(v)} aria-label={`Supprimer le brouillon V${v.number}`}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      <dialog ref={dialog} className="adm-modal" aria-labelledby="vid-version-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="vid-version-title">Nouvelle version</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label="Fermer">
              <X size={18} />
            </button>
          </header>
          <label className="adm-field">
            <span>Lien de la vidéo</span>
            <input type="url" required inputMode="url" placeholder="https://f.io/… ou https://www.dropbox.com/…" maxLength={2000} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <small className={form.url && !detected ? "vid-field-bad" : "adm-muted"}>
              {form.url ? (detected ? `Fournisseur détecté : ${PROVIDERS[detected]}` : "Lien non reconnu") : "Google Drive, Dropbox, WeTransfer, Frame.io ou OneDrive"}
            </small>
          </label>
          <label className="adm-field">
            <span>Intitulé (facultatif)</span>
            <input maxLength={80} placeholder={`V${(versions[0]?.number ?? 0) + 1} — montage complet`} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </label>
          <label className="adm-field">
            <span>Notes pour le client (facultatif)</span>
            <textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
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
              {pending ? "Ajout…" : "Ajouter la version"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
