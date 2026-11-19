import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TZ, dayKey, nextDayKey } from "@/lib/commercial/time";
import { loadMyProjects } from "./projects";
import { isDoneStage, urgencyOf } from "./stages";
import type { VideasteMe } from "./session";

/*
 * Videographer dashboard (Espace Vidéaste handoff, page 05) — "what do I do today", not a reporting screen:
 *   Projets en cours            assigned projects not delivered yet
 *   À livrer cette semaine      of those, deadline on or before this Sunday (overdue included: still to deliver)
 *   Retours clients à traiter   projects in the "modifications" stage
 *   Projets terminés ce mois    projects that reached "livré" this month
 * then today's tasks, upcoming deadlines and the active project cards.
 *
 * Every query is filtered on the videographer's id AND runs with their own session, so RLS
 * (video_projects.videaste_id = auth.uid(), tasks.assigned_to = auth.uid()) re-checks it in the database:
 * another videographer's project can never be returned, whatever the browser sends.
 * Days are counted in Europe/Paris, like the rest of the staff spaces.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

type TaskRow = {
  id: string;
  title: string;
  type: string;
  due_at: string;
  status: "a_faire" | "fait";
  done_at: string | null;
  project_id: string | null;
  priority?: string | null;
  client_name?: string | null;
  started_at?: string | null;
};

export type TaskState = "a_faire" | "en_cours" | "fait";

/** Today's open tasks (overdue included) and the ones finished today. `progress` = "en cours" is available (013). */
async function loadMyTasks(supabase: Supabase, me: VideasteMe, startToday: string, endToday: string) {
  const base = "id, title, type, due_at, status, done_at, project_id, priority, client_name";
  for (const withProgress of [true, false]) {
    const columns = base + (withProgress ? ", started_at" : "");
    const [open, done] = await Promise.all([
      supabase.from("tasks").select(columns).eq("assigned_to", me.id).eq("status", "a_faire").lt("due_at", endToday).order("due_at").limit(100),
      supabase.from("tasks").select(columns).eq("assigned_to", me.id).eq("status", "fait").gte("done_at", startToday).order("done_at").limit(50),
    ]);
    if (!open.error && !done.error) {
      return { ready: true, progress: withProgress, rows: [...((open.data ?? []) as unknown as TaskRow[]), ...((done.data ?? []) as unknown as TaskRow[])] };
    }
    if (!withProgress) console.error("Videaste dashboard: tasks failed:", (open.error ?? done.error)?.message);
  }
  return { ready: false, progress: false, rows: [] as TaskRow[] };
}

/** ISO instant of 00:00 in Paris on a "YYYY-MM-DD" day. */
function parisMidnightISO(key: string) {
  const utc = Date.parse(`${key}T00:00:00Z`);
  const offsetHours = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(utc));
  return new Date(utc - offsetHours * 3_600_000).toISOString();
}

export async function loadVideasteDashboard(me: VideasteMe, now = new Date()) {
  const supabase = await createClient();
  const todayKey = dayKey(now);
  const tomorrowKey = nextDayKey(todayKey);
  const weekday = new Date(`${todayKey}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  let weekEndKey = todayKey;
  for (let i = 0; i < (7 - weekday) % 7; i++) weekEndKey = nextDayKey(weekEndKey);
  const monthKey = todayKey.slice(0, 7);

  const [projectsRes, tasksRes] = await Promise.all([loadMyProjects(me, now), loadMyTasks(supabase, me, parisMidnightISO(todayKey), parisMidnightISO(tomorrowKey))]);
  const projects = projectsRes.projects;

  const active = projects.filter((p) => p.stage !== "livre");
  // Before 013 there is no "modifications" stage: a requested revision round is the closest real signal.
  const toRevise = projectsRes.stagesReady ? active.filter((p) => p.stage === "modifications") : active.filter((p) => p.revisionRounds > 0);

  const byId = new Map(projects.map((p) => [p.id, p]));
  const tasks = tasksRes.rows
    .map((t) => {
      const state: TaskState = t.status === "fait" ? "fait" : t.started_at ? "en_cours" : "a_faire";
      const project = t.project_id ? byId.get(t.project_id) : undefined;
      const dueKey = dayKey(t.due_at);
      return {
        id: t.id,
        title: t.title,
        type: t.type,
        dueAt: t.due_at,
        dueKey,
        state,
        priority: t.priority === "haute" || t.priority === "basse" ? t.priority : "normale",
        context: project ? `${project.title} · ${project.client}` : (t.client_name ?? null),
        overdue: state !== "fait" && dueKey < todayKey,
        urgency: urgencyOf(dueKey, todayKey, state === "fait"),
      };
    })
    // Open first (most urgent first), then the ones already done today.
    .sort((a, b) => Number(a.state === "fait") - Number(b.state === "fait") || a.dueAt.localeCompare(b.dueAt));

  // Upcoming deadlines: every project still in work with a date (validated ones stay, shown green), soonest first.
  const deadlines = active.filter((p) => p.deadline).slice(0, 8);
  const groups: { key: string; label: string; items: typeof deadlines }[] = [];
  for (const p of deadlines) {
    const key = p.deadline! < todayKey && p.urgency !== "done" ? "late" : p.deadline!;
    const label = key === "late" ? "En retard" : key === todayKey ? "Aujourd'hui" : key === tomorrowKey ? "Demain" : "";
    const group = groups.find((g) => g.key === key);
    if (group) group.items.push(p);
    else groups.push({ key, label, items: [p] });
  }

  return {
    firstName: me.firstName,
    todayKey,
    tomorrowKey,
    stagesReady: projectsRes.stagesReady,
    tasksReady: tasksRes.ready,
    progressReady: tasksRes.progress,
    kpis: {
      inProgress: active.length,
      dueThisWeek: active.filter((p) => !isDoneStage(p.stage) && p.deadline && p.deadline <= weekEndKey).length,
      toRevise: toRevise.length,
      deliveredMonth: projects.filter((p) => p.stage === "livre" && p.stageAt && dayKey(p.stageAt).slice(0, 7) === monthKey).length,
    },
    tasks,
    openTasks: tasks.filter((t) => t.state !== "fait").length,
    deadlineGroups: groups,
    cards: active.slice(0, 6),
    activeTotal: active.length,
  };
}

export type VideasteDashboard = Awaited<ReturnType<typeof loadVideasteDashboard>>;
