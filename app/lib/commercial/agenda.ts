import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CommercialMe } from "./session";
import { dayKey } from "./time";

/*
 * Agenda & tasks of the signed-in rep (handoff pages 05–06, migration 012). Only their own rows: every query is filtered
 * on the rep's id AND runs with their session (RLS) — another rep's events or tasks can never be read.
 *   calendar = the rep's agenda_events + the scheduled tasks given to them (appel / rdv / réunion)
 *   panel    = every other task of the rep (relances, to-dos…), including the ones they created themselves
 */

export type EventType = "appel" | "rdv" | "rappel" | "visite";
export const EVENT_TYPES: EventType[] = ["appel", "rdv", "rappel", "visite"];
export type AgendaFilter = "" | "rdv" | "appel" | "rappel" | "visite";
const SCHEDULED_TASK_TYPES = new Set(["appel", "rdv", "reunion"]);

export type CalendarItem = {
  id: string;
  source: "event" | "task";
  title: string;
  clientName: string | null;
  type: string; // event type, or task type for task items
  startsAt: string;
  durationMinutes: number | null;
  location: string | null;
  notes: string | null;
  status: "prevu" | "fait" | "annule";
  editable: boolean;
};
export type PanelTask = { id: string; title: string; clientName: string | null; type: string; dueAt: string; priority: "basse" | "normale" | "haute"; done: boolean; overdue: boolean; mine: boolean };

const DAY = 86_400_000;
/** Filter chip → the event / task types it shows. */
const FILTER_TYPES: Record<Exclude<AgendaFilter, "">, string[]> = { rdv: ["rdv", "reunion"], appel: ["appel"], rappel: ["rappel", "relance"], visite: ["visite"] };

export async function loadMyAgenda(me: CommercialMe, filter: AgendaFilter, now = Date.now()) {
  const supabase = await createClient();
  const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  const [eventsRes, tasksRes] = await Promise.all([
    supabase
      .from("agenda_events")
      .select("id, title, client_name, type, starts_at, duration_minutes, location, notes, status")
      .eq("salesperson_id", me.id)
      .gte("starts_at", new Date(startOfToday - 30 * DAY).toISOString())
      .order("starts_at")
      .limit(500),
    // select("*"): priority / client_name exist from migration 012.
    supabase.from("tasks").select("*").eq("assigned_to", me.id).order("due_at").limit(500),
  ]);

  const items: CalendarItem[] = [];
  for (const e of eventsRes.data ?? []) {
    items.push({
      id: e.id,
      source: "event",
      title: e.title,
      clientName: e.client_name,
      type: e.type,
      startsAt: e.starts_at,
      durationMinutes: e.duration_minutes,
      location: e.location,
      notes: e.notes,
      status: e.status,
      editable: true,
    });
  }
  const panel: PanelTask[] = [];
  for (const t of (tasksRes.data ?? []) as Record<string, unknown>[]) {
    const done = t.status === "fait";
    const due = t.due_at as string;
    if (SCHEDULED_TASK_TYPES.has(t.type as string)) {
      if (new Date(due).getTime() < startOfToday - 30 * DAY) continue;
      items.push({
        id: t.id as string,
        source: "task",
        title: t.title as string,
        clientName: (t.client_name as string | null) ?? null,
        type: t.type as string,
        startsAt: due,
        durationMinutes: null,
        location: null,
        notes: (t.notes as string | null) ?? null,
        status: done ? "fait" : "prevu",
        editable: false,
      });
    } else {
      // Done tasks older than 7 days drop off the panel.
      if (done && new Date((t.done_at as string | null) ?? due).getTime() < now - 7 * DAY) continue;
      panel.push({
        id: t.id as string,
        title: t.title as string,
        clientName: (t.client_name as string | null) ?? null,
        type: t.type as string,
        dueAt: due,
        priority: ((t.priority as PanelTask["priority"]) ?? "normale") as PanelTask["priority"],
        done,
        overdue: !done && new Date(due).getTime() < now,
        mine: t.assigned_by === me.id,
      });
    }
  }
  items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const prio = { haute: 0, normale: 1, basse: 2 } as const;
  panel.sort((a, b) => Number(a.done) - Number(b.done) || prio[a.priority] - prio[b.priority] || a.dueAt.localeCompare(b.dueAt));

  const weekEnd = startOfToday + 7 * DAY;
  const upcoming = items.filter((i) => i.status === "prevu" && new Date(i.startsAt).getTime() >= startOfToday);
  const shown = items
    .filter((i) => !filter || FILTER_TYPES[filter].includes(i.type))
    // Past items stay visible only when still "prévu" (overdue), or from today on.
    .filter((i) => new Date(i.startsAt).getTime() >= startOfToday || i.status === "prevu");

  return {
    eventsReady: !eventsRes.error,
    tasksReady: !tasksRes.error,
    ownTasksReady: !tasksRes.error && ((tasksRes.data ?? []).length === 0 || "priority" in ((tasksRes.data ?? [])[0] as object)),
    items: shown,
    panel,
    startOfToday,
    /** Today in Paris, for the day groups of the calendar. */
    todayKey: dayKey(now),
    kpis: {
      meetingsWeek: upcoming.filter((i) => ["rdv", "reunion", "visite"].includes(i.type) && new Date(i.startsAt).getTime() < weekEnd).length,
      calls: upcoming.filter((i) => i.type === "appel").length,
      followUps: upcoming.filter((i) => i.type === "rappel").length + panel.filter((t) => !t.done && t.type === "relance").length,
      openTasks: panel.filter((t) => !t.done).length,
    },
  };
}
export type MyAgenda = Awaited<ReturnType<typeof loadMyAgenda>>;

/** Next appointments for the dashboard widget: the rep's events + scheduled tasks, from now on. */
export async function loadNextAppointments(me: CommercialMe, limit = 5) {
  const supabase = await createClient();
  const from = new Date(Date.now() - 3_600_000).toISOString();
  const { data } = await supabase
    .from("agenda_events")
    .select("id, title, client_name, type, starts_at, location")
    .eq("salesperson_id", me.id)
    .eq("status", "prevu")
    .gte("starts_at", from)
    .order("starts_at")
    .limit(limit);
  return (data ?? []).map((e) => ({ id: e.id as string, title: e.title as string, notes: [e.client_name, e.location].filter(Boolean).join(" · ") || null, type: e.type as string, dueAt: e.starts_at as string }));
}
