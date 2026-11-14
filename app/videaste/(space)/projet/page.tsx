import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/videaste/ProjectDetailView";
import { isUuid } from "@/lib/admin/team";
import { loadMyProject } from "@/lib/videaste/projects";
import { requireVideaste } from "@/lib/videaste/session";

/**
 * videaste/projet.html?id= (handoff page 07). The id comes from the URL, so it is never trusted: the project is read
 * with a filter on the signed-in videographer's id and their own session (RLS). Not theirs (or not existing) → 404,
 * the same answer either way, so ids cannot be probed.
 */
export default async function ProjetPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const me = await requireVideaste(`/videaste/projet${id ? `?id=${encodeURIComponent(id)}` : ""}`);
  if (!isUuid(id)) notFound();
  const data = await loadMyProject(me, id);
  if (!data) notFound();
  return <ProjectDetailView data={data} />;
}
