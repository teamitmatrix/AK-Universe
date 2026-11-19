import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/commercial/time";
import { loadMyProjects } from "./projects";
import { isDoneStage, urgencyOf, type Urgency } from "./stages";
import type { VideasteMe } from "./session";

/*
 * Agenda of the videographer (handoff page 08): shoots, client meetings, team meetings, reviews, deliveries and the
 * deadlines of their projects, grouped by day, with their tasks in a side panel. Events live in the existing
 * agenda_events table (owner = salesperson_id, migration 013 opens it to videographers); deadlines come straight from
 * their projects (never copied); tasks from the shared tasks table. Only their own rows (filter + RLS).
 * A future Google Calendar / Outlook sync would read the same rows — that sync itself is intentionally not built.
 */

export const VID_EVENT_TYPES = { tournage: "Tournage", rdv: "RDV client", reunion: "Réunion", deadline: "Deadline", revue: "Revue", livraison: "Livraison" } as const;
export type VidEventType = keyof typeof VID_EVENT_TYPES;

export type AgendaItem = {
  id: string;
  source: "event" | "deadline";
  type: VidEventType;
  title: string;
  startsAt: string | null; // null = all-day (project deadline)
  dayKey: string;
  durationMinutes: number | null;
  location: string | null;
  notes: string | null;
  projectId: string | null;
  projectLabel: string | null;
  urgency: Urgency;
};

const HORIZON_DAYS = 60;

export async function loadMyAgenda(me: VideasteMe, now = new Date()) {
  const supabase = await createClient();
  const { projects, todayKey, stagesReady } = await loadMyProjects(me, now);
  const from = new Date(now.getTime() - 36 * 3_600_000).toISOString();
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000).toISOString();

  const [eventsRes, tasksRes] = await Promise.all([
    supabase
      .from("agenda_events")
      .select("id, title, type, starts_at, duration_minutes, location, notes, status, project_id")
      .eq("salesperson_id", me.id)
      .neq("status", "annule")
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at")
      .limit(500),
    supabase.from("tasks").select("*").eq("assigned_to", me.id).eq("status", "a_faire").lte("due_at", to).order("due_at").limit(200),
  ]);

  const byId = new Map(projects.map((p) => [p.id, p]));
  const label = (id: string | null) => (id && byId.get(id) ? `${byId.get(id)!.title} · ${byId.get(id)!.client}` : null);
  const items: AgendaItem[] = [];

  for (const e of eventsRes.error ? [] : (eventsRes.data ?? [])) {
    const key = dayKey(e.starts_at as string);
    if (key < todayKey) continue;
    items.push({
      id: e.id as string,
      source: "event",
      type: ((e.type as string) in VID_EVENT_TYPES ? e.type : "reunion") as VidEventType,
      title: e.title as string,
      startsAt: e.starts_at as string,
      dayKey: key,
      durationMinutes: (e.duration_minutes as number | null) ?? null,
      location: (e.location as string | null) ?? null,
      notes: (e.notes as string | null) ?? null,
      projectId: (e.project_id as string | null) ?? null,
      projectLabel: label((e.project_id as string | null) ?? null),
      urgency: e.type === "deadline" ? urgencyOf(key, todayKey, e.status === "fait") : "none",
    });
  }
  // Deadlines of the projects still in work: today onwards, plus overdue ones (shown under today, in red).
  for (const p of projects) {
    if (!p.deadline || p.stage === "livre") continue;
    const overdue = p.deadline < todayKey;
    items.push({
      id: `deadline-${p.id}`,
      source: "deadline",
      type: "deadline",
      title: overdue ? `${p.title} — deadline dépassée` : p.title,
      startsAt: null,
      dayKey: overdue ? todayKey : p.deadline,
      durationMinutes: null,
      location: null,
      notes: overdue ? `Prévue le ${p.deadline.split("-").reverse().join("/")}` : null,
      projectId: p.id,
      projectLabel: p.client,
      urgency: urgencyOf(p.deadline, todayKey, isDoneStage(p.stage)),
    });
  }
  items.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || Number(a.startsAt !== null) - Number(b.startsAt !== null) || (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

  const days: { key: string; items: AgendaItem[] }[] = [];
  for (const item of items) {
    const day = days.find((d) => d.key === item.dayKey);
    if (day) day.items.push(item);
    else days.push({ key: item.dayKey, items: [item] });
  }

  const tasks = tasksRes.error
    ? []
    : (tasksRes.data ?? []).map((t) => {
        const key = dayKey(t.due_at as string);
        return {
          id: t.id as string,
          title: t.title as string,
          dueAt: t.due_at as string,
          dueKey: key,
          state: (t.started_at ? "en_cours" : "a_faire") as "a_faire" | "en_cours",
          priority: (t.priority === "haute" || t.priority === "basse" ? t.priority : "normale") as string,
          context: label((t.project_id as string | null) ?? null) ?? ((t.client_name as string | null) || null),
          urgency: urgencyOf(key, todayKey, false),
        };
      });

  return {
    todayKey,
    eventsReady: stagesReady && !eventsRes.error,
    progressReady: stagesReady,
    days,
    tasks,
    projects: projects.filter((p) => p.stage !== "livre").map((p) => ({ id: p.id, label: `${p.title} — ${p.client}` })),
  };
}
export type VideasteAgenda = Awaited<ReturnType<typeof loadMyAgenda>>;
