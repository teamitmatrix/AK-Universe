"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, ExternalLink, FileText, FolderOpen, Image as ImageIcon, Info, Link2, Music, Shapes, Trash2, Video, X, type LucideIcon } from "lucide-react";
import { addProjectFile, deleteProjectFile } from "@/lib/videaste/project-actions";
import type { ProjectFile } from "@/lib/videaste/projects";
import { downloadUrlOf, FILE_CATEGORIES, PROVIDERS, providerOf, type FileCategory } from "@/lib/videaste/storage";
import { VID_ERRORS } from "./vidUi";

export const CATEGORY_ICON: Record<FileCategory, LucideIcon> = {
  rushs: Video,
  musique: Music,
  logos: Shapes,
  images: ImageIcon,
  documents: FileText,
  exports: FolderOpen,
  versions_finales: Video,
};

/** One external link (opens the provider in a new tab; AK Universe only keeps the link). */
export function FileTile({ file, meId, context, onDelete, pending }: { file: ProjectFile; meId: string; context?: string; onDelete?: (id: string) => void; pending?: boolean }) {
  const Icon = CATEGORY_ICON[file.category] ?? FileText;
  return (
    <li className="vid-file">
      <span className="vid-file-ic" aria-hidden="true">
        <Icon size={16} />
      </span>
      <span className="adm-stack">
        <strong title={file.name}>{file.name}</strong>
        <span className="adm-person-mail">
          {FILE_CATEGORIES[file.category]} · {PROVIDERS[file.provider]}
          {context ? ` · ${context}` : ""}
        </span>
      </span>
      <a href={file.external_url} target="_blank" rel="noopener noreferrer nofollow" className="adm-icon-btn" aria-label={`Ouvrir « ${file.name} » sur ${PROVIDERS[file.provider]}`}>
        <ExternalLink size={15} />
      </a>
      <a
        href={downloadUrlOf(file.external_url, file.provider)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="adm-icon-btn"
        download={file.name}
        aria-label={`Télécharger « ${file.name} »`}
        title="Télécharger"
      >
        <Download size={15} />
      </a>
      {onDelete && file.added_by === meId && (
        <button type="button" className="adm-icon-btn" disabled={pending} onClick={() => onDelete(file.id)} aria-label={`Retirer le lien « ${file.name} »`}>
          <Trash2 size={15} />
        </button>
      )}
    </li>
  );
}

/** "Fichiers du projet": categorised links to the project's existing storage + "Ajouter / lier un fichier". */
export function FilesPanel({ projectId, files, meId }: { projectId: string; files: ProjectFile[]; meId: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<FileCategory | "">("");
  const [form, setForm] = useState({ category: "rushs" as FileCategory, name: "", url: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const used = (Object.keys(FILE_CATEGORIES) as FileCategory[]).filter((c) => files.some((f) => f.category === c));
  const shown = files.filter((f) => !filter || f.category === filter);
  const detected = form.url ? providerOf(form.url) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!detected) return setError("Lien non reconnu : collez un lien https Google Drive, Dropbox, WeTransfer, Frame.io ou OneDrive.");
    start(async () => {
      const res = await addProjectFile(projectId, form);
      if (!res.success) return setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      dialog.current?.close();
      setForm({ category: form.category, name: "", url: "" });
      router.refresh();
    });
  }

  function remove(id: string) {
    const file = files.find((f) => f.id === id);
    if (!file || !window.confirm(`Retirer le lien « ${file.name} » ? Le fichier reste sur ${PROVIDERS[file.provider]}.`)) return;
    start(async () => {
      const res = await deleteProjectFile(id);
      if (!res.success) return window.alert(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      router.refresh();
    });
  }

  return (
    <section className="adm-card" aria-labelledby="vid-files-title">
      <header className="adm-card-head">
        <h2 id="vid-files-title">
          <FolderOpen size={17} aria-hidden="true" />
          Fichiers du projet
        </h2>
        <button
          type="button"
          className="adm-btn is-ghost sm"
          onClick={() => {
            setError(null);
            dialog.current?.showModal();
          }}
        >
          <Link2 size={14} aria-hidden="true" /> Ajouter / lier un fichier
        </button>
      </header>
      {used.length > 1 && (
        <div className="vid-chips" role="group" aria-label="Filtrer par catégorie">
          <button type="button" className={!filter ? "is-active" : undefined} aria-pressed={!filter} onClick={() => setFilter("")}>
            Tous
          </button>
          {used.map((c) => (
            <button key={c} type="button" className={filter === c ? "is-active" : undefined} aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {FILE_CATEGORIES[c]}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="adm-empty">Aucun fichier lié pour le moment.</p>
      ) : (
        <ul className="vid-files">
          {shown.map((f) => (
            <FileTile key={f.id} file={f} meId={meId} onDelete={remove} pending={pending} />
          ))}
        </ul>
      )}
      <p className="vid-hint">
        <Info size={13} aria-hidden="true" />
        Les fichiers restent sur votre stockage habituel (Drive, Dropbox, WeTransfer, Frame.io, OneDrive…) — AK Universe conserve simplement le lien.
      </p>

      <dialog ref={dialog} className="adm-modal" aria-labelledby="vid-file-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="vid-file-title">Lier un fichier</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label="Fermer">
              <X size={18} />
            </button>
          </header>
          <label className="adm-field">
            <span>Lien de partage</span>
            <input type="url" required inputMode="url" placeholder="https://drive.google.com/…" maxLength={2000} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <small className={form.url && !detected ? "vid-field-bad" : "adm-muted"}>
              {form.url ? (detected ? `Fournisseur détecté : ${PROVIDERS[detected]}` : "Lien non reconnu") : "Google Drive, Dropbox, WeTransfer, Frame.io ou OneDrive"}
            </small>
          </label>
          <label className="adm-field">
            <span>Nom du fichier</span>
            <input required maxLength={160} placeholder="Rushs_terrasse_brut.mp4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="adm-field">
            <span>Catégorie</span>
            <select className="adm-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FileCategory })}>
              {(Object.keys(FILE_CATEGORIES) as FileCategory[]).map((c) => (
                <option key={c} value={c}>
                  {FILE_CATEGORIES[c]}
                </option>
              ))}
            </select>
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
              {pending ? "Ajout…" : "Ajouter le lien"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
