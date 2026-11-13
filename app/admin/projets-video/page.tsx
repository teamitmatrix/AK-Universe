import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectsView } from "@/components/admin/space/ProjectsView";
import { PROJECT_STATUS } from "@/config/projects";
import { oneOf } from "@/lib/admin/crm";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadVideoProjects, UNASSIGNED, type ProjectFilter } from "@/lib/admin/projects";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Projets vidéo — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function ProjetsVideoPage({ searchParams }: { searchParams: Promise<{ videaste?: string; statut?: string }> }) {
  // Server-side role check on every request (the proxy only guarantees a session).
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: ProjectFilter = {
    videaste: sp.videaste === UNASSIGNED || /^[0-9a-f-]{36}$/i.test(sp.videaste ?? "") ? (sp.videaste as string) : "",
    status: oneOf(sp.statut, ["retard", ...Object.keys(PROJECT_STATUS)]),
  };
  const [lang, data] = await Promise.all([getLang(), loadVideoProjects(filter)]);
  return <ProjectsView lang={lang} admin={admin} data={data} filter={filter} />;
}
