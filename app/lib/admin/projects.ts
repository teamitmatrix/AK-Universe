import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUS } from "@/config/projects";
import { displayName, isActiveProject, selectProjects, todayISO, type StaffProfile } from "./team";

/**
 * "Projets vidéo" (handoff screen admin/projets-video): every video project across every videographer,
 * read from video_projects (+ assignment columns of migration 005 / revision rounds of 006).
 * Assignment itself is edited in the existing "Demandes vidéo" tab — not duplicated here.
 */

export type ProjectFilter = { videaste: string; status: string };
export const UNASSIGNED = "aucun";

export async function loadVideoProjects(filter: ProjectFilter, now = new Date()) {
  const supabase = await createClient();
  const [{ projects, level }, { data: staff }] = await Promise.all([
    selectProjects(supabase, { extra: "items" }, 2000),
    supabase.from("profiles").select("*").in("role", ["commercial", "videaste"]).order("first_name"),
  ]);
  const people = new Map(((staff ?? []) as StaffProfile[]).map((p) => [p.id, p]));
  const today = todayISO(now);

  const all = projects.map((p) => ({
    id: p.id,
    reference: p.reference,
    title: (p.items ?? []).map((i) => i.service).join(" + ") || "—",
    client: p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—",
    videasteId: p.videaste_id ?? null,
    videaste: p.videaste_id ? (people.get(p.videaste_id) ? displayName(people.get(p.videaste_id)!) : "—") : null,
    commercial: p.commercial_id ? (people.get(p.commercial_id) ? displayName(people.get(p.commercial_id)!) : "—") : null,
    deadline: p.deadline ?? null,
    late: Boolean(p.deadline && p.deadline < today && isActiveProject(p.status)),
    status: p.status,
    revisions: p.revision_rounds ?? null,
    totalCents: p.total_cents,
    createdAt: p.created_at,
  }));

  const rows = all
    .filter((r) => !filter.videaste || (filter.videaste === UNASSIGNED ? !r.videasteId : r.videasteId === filter.videaste))
    .filter((r) => !filter.status || (filter.status === "retard" ? r.late : r.status === filter.status))
    // Late first, then by deadline (soonest first), then newest.
    .sort((a, b) => Number(b.late) - Number(a.late) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || b.createdAt.localeCompare(a.createdAt));

  return {
    assignment: level !== "none",
    hasRevisions: level === "revisions",
    videastes: ((staff ?? []) as StaffProfile[]).filter((s) => s.role === "videaste").map((s) => ({ id: s.id, name: displayName(s), active: s.active !== false })),
    statuses: Object.keys(PROJECT_STATUS),
    kpis: {
      active: all.filter((r) => isActiveProject(r.status)).length,
      delivered: all.filter((r) => r.status === "termine").length,
      late: all.filter((r) => r.late).length,
      total: all.length,
    },
    rows,
  };
}
