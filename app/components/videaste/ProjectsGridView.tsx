import Link from "next/link";
import { Info, Search } from "lucide-react";
import { nextDayKey } from "@/lib/commercial/time";
import type { MyProject } from "@/lib/videaste/projects";
import type { Stage } from "@/lib/videaste/stages";
import { ProjectCard } from "./vidUi";

/*
 * videaste/mes-projets (handoff page 06): filter tabs + search over the videographer's own projects, and the visual
 * card grid (type chip, stage badge, deadline, progress) so no project has to be opened just to see where it stands.
 * Filtering happens on the server (query string), so the list is shareable and works without JavaScript.
 */

export const PROJECT_TABS = [
  { id: "", label: "Tous", stages: null },
  { id: "en-cours", label: "En cours", stages: ["brief_recu", "tournage", "montage"] },
  { id: "a-valider", label: "À valider", stages: ["a_valider"] },
  { id: "modifications", label: "Modifications", stages: ["modifications"] },
  { id: "valides", label: "Validés", stages: ["valide"] },
  { id: "livres", label: "Livrés", stages: ["livre"] },
] as const satisfies readonly { id: string; label: string; stages: readonly Stage[] | null }[];
export type ProjectTabId = (typeof PROJECT_TABS)[number]["id"];

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function ProjectsGridView({ projects, todayKey, stagesReady, tab, q }: { projects: MyProject[]; todayKey: string; stagesReady: boolean; tab: ProjectTabId; q: string }) {
  const inTab = (id: ProjectTabId, p: MyProject) => {
    const stages = PROJECT_TABS.find((t) => t.id === id)?.stages;
    return !stages || (stages as readonly Stage[]).includes(p.stage);
  };
  const needle = normalize(q.trim());
  const matches = (p: MyProject) =>
    !needle || normalize(`${p.title} ${p.client} ${p.reference} ${p.videoType ?? ""} ${p.services.join(" ")}`).includes(needle);
  const searched = projects.filter(matches);
  const shown = searched.filter((p) => inTab(tab, p));
  const href = (id: string) => {
    const sp = new URLSearchParams();
    if (id) sp.set("filtre", id);
    if (q.trim()) sp.set("q", q.trim());
    return `/videaste/mes-projets${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Mes projets</h2>
          <p>Tous vos projets vidéo, du brief à la livraison.</p>
        </div>
      </div>
      {!stagesReady && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Étapes déduites du statut du projet tant que la migration 013 n&apos;est pas appliquée.
        </p>
      )}

      <div className="vid-toolbar">
        <nav className="vid-tabs" aria-label="Filtrer les projets">
          {PROJECT_TABS.map((t) => {
            const count = searched.filter((p) => inTab(t.id, p)).length;
            const active = t.id === tab;
            return (
              <Link key={t.id || "tous"} href={href(t.id)} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined} scroll={false}>
                {t.label}
                <small>{count}</small>
              </Link>
            );
          })}
        </nav>
        <form className="adm-search vid-search" action="/videaste/mes-projets" role="search">
          {tab && <input type="hidden" name="filtre" value={tab} />}
          <Search size={15} aria-hidden="true" />
          <input type="search" name="q" defaultValue={q} placeholder="Rechercher un projet ou un client…" aria-label="Rechercher un projet ou un client" maxLength={80} />
        </form>
      </div>

      {shown.length === 0 ? (
        <p className="adm-empty vid-empty-card">
          {projects.length === 0 ? "Aucun projet ne vous est attribué pour le moment." : needle ? `Aucun projet ne correspond à « ${q.trim()} ».` : "Aucun projet dans cette catégorie."}
        </p>
      ) : (
        <ul className="vid-cards">
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} todayKey={todayKey} tomorrowKey={nextDayKey(todayKey)} />
          ))}
        </ul>
      )}
    </div>
  );
}
