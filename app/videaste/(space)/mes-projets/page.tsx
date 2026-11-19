import { PROJECT_TABS, ProjectsGridView, type ProjectTabId } from "@/components/videaste/ProjectsGridView";
import { loadMyProjects } from "@/lib/videaste/projects";
import { requireVideaste } from "@/lib/videaste/session";

/** videaste/mes-projets.html (handoff page 06). Only the signed-in videographer's projects (requireVideaste + RLS). */
export default async function MesProjetsPage({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string }> }) {
  const me = await requireVideaste("/videaste/mes-projets");
  const [{ filtre, q }, data] = await Promise.all([searchParams, loadMyProjects(me)]);
  const tab = (PROJECT_TABS.some((t) => t.id === filtre) ? filtre : "") as ProjectTabId;
  return <ProjectsGridView projects={data.projects} todayKey={data.todayKey} stagesReady={data.stagesReady} tab={tab} q={String(q ?? "").slice(0, 80)} />;
}
