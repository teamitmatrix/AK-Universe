"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProjectFile } from "@/lib/videaste/projects";
import { FILE_CATEGORIES, type FileCategory } from "@/lib/videaste/storage";
import { FileTile } from "./FilesPanel";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * videaste/fichiers (handoff page 09): every link to the external storage of every assigned project, in one view,
 * grouped by project, filterable by category and searchable — without opening each project. The data was already
 * scoped on the server (RLS); filtering here is only display.
 */
export function FilesView({ projects, files, meId }: { projects: { id: string; title: string; client: string }[]; files: ProjectFile[]; meId: string }) {
  const [category, setCategory] = useState<FileCategory | "">("");
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const needle = normalize(q.trim());
  const shown = files.filter((f) => {
    if (category && f.category !== category) return false;
    if (!needle) return true;
    const p = byId.get(f.project_id);
    return normalize(`${f.name} ${p?.title ?? ""} ${p?.client ?? ""}`).includes(needle);
  });
  const groups = projects.map((p) => ({ p, files: shown.filter((f) => f.project_id === p.id) })).filter((g) => g.files.length > 0);

  return (
    <>
      <div className="vid-toolbar">
        <div className="vid-chips" role="group" aria-label="Filtrer par catégorie">
          <button type="button" className={!category ? "is-active" : undefined} aria-pressed={!category} onClick={() => setCategory("")}>
            Tous <small>{files.length}</small>
          </button>
          {(Object.keys(FILE_CATEGORIES) as FileCategory[]).map((c) => {
            const n = files.filter((f) => f.category === c).length;
            return (
              <button key={c} type="button" className={category === c ? "is-active" : undefined} aria-pressed={category === c} onClick={() => setCategory(c)} disabled={n === 0}>
                {FILE_CATEGORIES[c]} <small>{n}</small>
              </button>
            );
          })}
        </div>
        <label className="adm-search vid-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un fichier…" aria-label="Rechercher un fichier, un projet ou un client" maxLength={80} />
        </label>
      </div>
      {files.length === 0 ? (
        <p className="adm-empty vid-empty-card">Aucun fichier lié à vos projets. Ajoutez des liens depuis la page d&apos;un projet.</p>
      ) : groups.length === 0 ? (
        <p className="adm-empty vid-empty-card">Aucun fichier ne correspond à ces filtres.</p>
      ) : (
        groups.map(({ p, files: list }) => (
          <section key={p.id} className="adm-card" aria-label={`Fichiers de ${p.title}`}>
            <header className="adm-card-head">
              <h2>
                {p.title} <span className="adm-muted adm-small">· {p.client}</span>
              </h2>
              <Link href={`/videaste/projet?id=${p.id}`} className="adm-link">
                Ouvrir le projet
              </Link>
            </header>
            <ul className="vid-files">
              {list.map((f) => (
                <FileTile key={f.id} file={f} meId={meId} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
