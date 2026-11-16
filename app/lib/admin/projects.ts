import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUS } from "@/config/projects";
import { isStage, stageFromStatus, type Stage } from "@/lib/videaste/stages";
import type { Provider } from "@/lib/videaste/storage";
import { displayName, isActiveProject, selectProjects, todayISO, type StaffProfile } from "./team";

/**
 * "Projets vidéo" (handoff screen admin/projets-video + Espace Vidéaste page 10): every video project across every
 * videographer, read from video_projects (+ assignment of 005, revision rounds of 006, production stage of 013).
 * Inline reassignment / stage change / the client's answer on a sent version are server actions
 * (lib/admin/videaste-actions.ts). Read with the admin's session: RLS (is_admin()) re-checks the role.
 */

export type ProjectFilter = { videaste: string; status: string; client: string; late: boolean };
export const UNASSIGNED = "aucun";

export type PendingVersion = { id: string; projectId: string; number: number; label: string | null; url: string; provider: Provider; notes: string | null; sentAt: string | null };

export async function loadVideoProjects(filter: ProjectFilter, now = new Date()) {
  const supabase = await createClient();
  const [{ projects, level }, { data: staff }, stagesRes, pendingRes] = await Promise.all([
    selectProjects(supabase, { extra: "items" }, 2000),
    supabase.from("profiles").select("*").in("role", ["commercial", "videaste"]).order("first_name"),
    // Production stage and versions awaiting the client (migration 013); errors = not applied yet.
    supabase.from("video_projects").select("id, stage").limit(2000),
    supabase.from("project_versions").select("id, project_id, number, label, external_url, provider, notes, sent_at").eq("status", "envoyee").order("sent_at").limit(500),
  ]);
  const stagesReady = !stagesRes.error;
  const stageById = new Map((stagesRes.data ?? []).map((r) => [r.id as string, r.stage as string | null]));
  const pendingByProject = new Map<string, PendingVersion>();
  for (const v of pendingRes.error ? [] : (pendingRes.data ?? [])) {
    pendingByProject.set(v.project_id as string, {
      id: v.id as string,
      projectId: v.project_id as string,
      number: v.number as number,
      label: (v.label as string | null) ?? null,
      url: v.external_url as string,
      provider: v.provider as Provider,
      notes: (v.notes as string | null) ?? null,
      sentAt: (v.sent_at as string | null) ?? null,
    });
  }
  const people = new Map(((staff ?? []) as StaffProfile[]).map((p) => [p.id, p]));
  const today = todayISO(now);

  const all = projects.map((p) => {
    const raw = stageById.get(p.id);
    const stage: Stage | null = isStage(raw) ? raw : stageFromStatus(p.status);
    return {
      id: p.id,
      reference: p.reference,
      title: (p.items ?? []).map((i) => i.service).join(" + ") || "—",
      client: p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—",
      videasteId: p.videaste_id ?? null,
      videaste: p.videaste_id ? (people.get(p.videaste_id) ? displayName(people.get(p.videaste_id)!) : "—") : null,
      commercial: p.commercial_id ? (people.get(p.commercial_id) ? displayName(people.get(p.commercial_id)!) : "—") : null,
      deadline: p.deadline ?? null,
      late: Boolean(p.deadline && p.deadline < today && isActiveProject(p.status) && stage !== "livre"),
      status: p.status,
      stage,
      pending: pendingByProject.get(p.id) ?? null,
      revisions: p.revision_rounds ?? null,
      totalCents: p.total_cents,
      createdAt: p.created_at,
    };
  });

  const rows = all
    .filter((r) => !filter.videaste || (filter.videaste === UNASSIGNED ? !r.videasteId : r.videasteId === filter.videaste))
    .filter((r) => !filter.client || r.client === filter.client)
    .filter((r) => !filter.status || r.stage === filter.status || r.status === filter.status)
    .filter((r) => !filter.late || r.late)
    // Waiting for the client first, then late, then by deadline (soonest first), then newest.
    .sort(
      (a, b) =>
        Number(Boolean(b.pending)) - Number(Boolean(a.pending)) ||
        Number(b.late) - Number(a.late) ||
        (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") ||
        b.createdAt.localeCompare(a.createdAt),
    );

  const videastes = ((staff ?? []) as StaffProfile[]).filter((s) => s.role === "videaste");
  return {
    assignment: level !== "none",
    hasRevisions: level === "revisions",
    stagesReady,
    videastes: videastes.map((s) => ({ id: s.id, name: displayName(s), active: s.active !== false })),
    clients: [...new Set(all.map((r) => r.client))].filter((c) => c !== "—").sort((a, b) => a.localeCompare(b, "fr")),
    statuses: Object.keys(PROJECT_STATUS),
    kpis: {
      active: all.filter((r) => isActiveProject(r.status) && r.stage !== "livre").length,
      delivered: all.filter((r) => r.status === "termine" || r.stage === "livre").length,
      late: all.filter((r) => r.late).length,
      total: all.length,
      pending: all.filter((r) => r.pending).length,
      activeVideastes: videastes.filter((s) => s.active !== false).length,
      totalVideastes: videastes.length,
    },
    rows,
  };
}
