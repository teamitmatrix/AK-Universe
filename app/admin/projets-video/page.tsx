import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectsView } from "@/components/admin/space/ProjectsView";
import { PROJECT_STATUS } from "@/config/projects";
import { oneOf } from "@/lib/admin/crm";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadVideoProjects, UNASSIGNED, type ProjectFilter } from "@/lib/admin/projects";
import { STAGES } from "@/lib/videaste/stages";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Projets vidéo — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function ProjetsVideoPage({ searchParams }: { searchParams: Promise<{ videaste?: string; statut?: string; client?: string; retard?: string }> }) {
  // Server-side role check on every request (the proxy only guarantees a session). Not an active admin → 404.
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: ProjectFilter = {
    videaste: sp.videaste === UNASSIGNED || /^[0-9a-f-]{36}$/i.test(sp.videaste ?? "") ? (sp.videaste as string) : "",
    status: oneOf(sp.statut, [...STAGES, ...Object.keys(PROJECT_STATUS)]),
    client: String(sp.client ?? "").slice(0, 160),
    // ?statut=retard is the older dashboard link: same meaning as "overdue only".
    late: sp.retard === "1" || sp.statut === "retard",
  };
  const [lang, data] = await Promise.all([getAdminLang(), loadVideoProjects(filter)]);
  return <ProjectsView lang={lang} admin={admin} data={data} filter={filter} />;
}
