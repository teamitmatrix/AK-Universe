import "server-only";
import { createClient } from "@/lib/supabase/server";
import { displayName, isActiveProject, type StaffProfile } from "./team";

/**
 * Unified agenda = existing data, merged and tagged by source — no separate event store:
 *   tasks                       (one shared table; source = the assignee's team)
 *   video_projects.deadline     (delivery deadlines, video team)
 *   video_projects.contact.date (shooting date requested by the client, video team)
 */

export const TASK_TYPES = ["appel", "rdv", "relance", "reunion", "tournage", "montage", "livraison", "tache"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export type AgendaSource = "commercial" | "video";
export type AgendaItem = {
  id: string;
  at: string; // ISO date-time (date-only items at 09:00 local)
  allDay: boolean;
  title: string;
  subtitle: string;
  kind: TaskType | "deadline" | "shoot";
  source: AgendaSource;
  overdue: boolean;
  done: boolean;
  taskId?: string;
};
export type AgendaFilter = { source: "" | AgendaSource; range: "semaine" | "mois" | "tout" };

type Task = { id: string; assigned_to: string; assigned_by: string | null; title: string; notes: string | null; type: TaskType; due_at: string; project_id: string | null; status: "a_faire" | "fait"; done_at: string | null; created_at: string };

const DAY = 86_400_000;
const dateOnly = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso);

export async function loadAgenda(filter: AgendaFilter, now = new Date()) {
  const supabase = await createClient();
  const [tasksRes, staffRes, projectsRes] = await Promise.all([
    supabase.from("tasks").select("*").order("due_at").limit(2000),
    supabase.from("profiles").select("*").in("role", ["commercial", "videaste", "admin"]),
    supabase
      .from("video_projects")
      .select("id, reference, status, deadline, videaste_id, commercial_id, shoot:contact->>date, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom")
      .not("status", "in", "(termine,annule)")
      .limit(2000),
  ]);
  const tasksReady = !tasksRes.error;
  const tasks = (tasksRes.data ?? []) as Task[];
  const people = new Map(((staffRes.data ?? []) as (StaffProfile | (Omit<StaffProfile, "role"> & { role: "admin" }))[]).map((p) => [p.id, p]));
  // Before migration 005 there is no deadline / assignment: fall back to the base columns.
  let projects = projectsRes.data as
    | { id: string; reference: string; status: string; deadline?: string | null; videaste_id?: string | null; commercial_id?: string | null; shoot: string | null; company: string | null; first_name: string | null; last_name: string | null }[]
    | null;
  if (projectsRes.error) {
    const base = await supabase
      .from("video_projects")
      .select("id, reference, status, shoot:contact->>date, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom")
      .not("status", "in", "(termine,annule)")
      .limit(2000);
    projects = base.data;
  }

  const nameOf = (id: string | null | undefined) => {
    const p = id ? people.get(id) : undefined;
    return p ? displayName(p) : null;
  };
  const items: AgendaItem[] = [];
  const nowMs = now.getTime();

  for (const t of tasks) {
    const assignee = people.get(t.assigned_to);
    items.push({
      id: `t:${t.id}`,
      taskId: t.id,
      at: t.due_at,
      allDay: false,
      title: t.title,
      subtitle: [nameOf(t.assigned_to), t.notes].filter(Boolean).join(" · "),
      kind: t.type,
      source: assignee?.role === "videaste" ? "video" : "commercial",
      overdue: t.status === "a_faire" && new Date(t.due_at).getTime() < nowMs,
      done: t.status === "fait",
    });
  }
  for (const p of projects ?? []) {
    if (!isActiveProject(p.status)) continue;
    const client = p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
    if (p.deadline) {
      items.push({
        id: `d:${p.id}`,
        at: `${p.deadline}T09:00:00`,
        allDay: true,
        title: `${p.reference} — ${client}`,
        subtitle: nameOf(p.videaste_id) ?? "",
        kind: "deadline",
        source: "video",
        overdue: new Date(`${p.deadline}T23:59:59`).getTime() < nowMs,
        done: false,
      });
    }
    if (p.shoot && dateOnly(p.shoot)) {
      items.push({
        id: `s:${p.id}`,
        at: `${p.shoot}T09:00:00`,
        allDay: true,
        title: `${p.reference} — ${client}`,
        subtitle: nameOf(p.videaste_id) ?? "",
        kind: "shoot",
        source: "video",
        overdue: false,
        done: false,
      });
    }
  }

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const horizon = filter.range === "semaine" ? startToday + 7 * DAY : filter.range === "mois" ? startToday + 31 * DAY : Infinity;
  const visible = items
    .filter((i) => !filter.source || i.source === filter.source)
    // Overdue open tasks always stay visible; done/past items older than 7 days drop off.
    .filter((i) => {
      const t = new Date(i.at).getTime();
      return (i.overdue && i.kind !== "deadline" ? true : t >= startToday - 7 * DAY) && t < horizon;
    })
    .sort((a, b) => a.at.localeCompare(b.at));

  const inDays = (i: AgendaItem, from: number, to: number) => {
    const t = new Date(i.at).getTime();
    return t >= from && t < to;
  };

  return {
    tasksReady,
    items: visible,
    kpis: {
      today: items.filter((i) => !i.done && inDays(i, startToday, startToday + DAY)).length,
      week: items.filter((i) => !i.done && inDays(i, startToday, startToday + 7 * DAY)).length,
      overdueTasks: items.filter((i) => i.taskId && i.overdue).length,
    },
    adminTasks: tasks
      .filter((t) => t.assigned_by && people.get(t.assigned_by)?.role === "admin")
      .sort((a, b) => Number(a.status === "fait") - Number(b.status === "fait") || a.due_at.localeCompare(b.due_at))
      .slice(0, 50)
      .map((t) => ({ id: t.id, title: t.title, type: t.type, dueAt: t.due_at, status: t.status, assignee: nameOf(t.assigned_to) ?? "—", overdue: t.status === "a_faire" && new Date(t.due_at).getTime() < nowMs })),
  };
}

/** Assignees and projects for the "Nouvelle tâche" modal (active staff only); null until migration 008. */
export async function loadTaskOptions() {
  const supabase = await createClient();
  const [{ error: noTasks }, { data: staff, error }, { data: projects }] = await Promise.all([
    // A plain 1-row read: a HEAD request does not surface "table does not exist".
    supabase.from("tasks").select("id").limit(1),
    supabase.from("profiles").select("*").in("role", ["commercial", "videaste"]).order("first_name"),
    supabase.from("video_projects").select("id, reference, company:contact->>entreprise").not("status", "in", "(termine,annule)").order("created_at", { ascending: false }).limit(200),
  ]);
  if (noTasks) return null;
  if (error) return { assignees: [], projects: [] };
  return {
    assignees: ((staff ?? []) as StaffProfile[]).filter((s) => s.active !== false).map((s) => ({ id: s.id, name: displayName(s), role: s.role })),
    projects: (projects ?? []).map((p) => ({ id: p.id, label: `${p.reference}${p.company ? ` — ${p.company}` : ""}` })),
  };
}

/** The signed-in staff member's own tasks and projects (/equipe). Same rows as the admin agenda. */
export async function loadMyWork(userId: string) {
  const supabase = await createClient();
  const [{ data: tasks, error }, { data: projects }] = await Promise.all([
    supabase.from("tasks").select("*").eq("assigned_to", userId).order("due_at").limit(500),
    supabase
      .from("video_projects")
      .select("id, reference, status, deadline, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom")
      .or(`videaste_id.eq.${userId},commercial_id.eq.${userId}`)
      .not("status", "in", "(termine,annule)")
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(200),
  ]);
  const now = Date.now();
  return {
    tasksReady: !error,
    tasks: ((tasks ?? []) as Task[]).map((t) => ({ ...t, overdue: t.status === "a_faire" && new Date(t.due_at).getTime() < now })),
    projects: projects ?? [],
  };
}
