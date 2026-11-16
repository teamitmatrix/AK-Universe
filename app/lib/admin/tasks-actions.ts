"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { notifyTaskAssigned } from "@/lib/notify";
import { TASK_TYPES, type TaskType } from "./agenda";
import { isUuid } from "./team";

/**
 * Tasks live in ONE shared table (migration 008). A task created here is the very row the assignee
 * sees in their own space (/equipe). Every action re-checks the caller; the assignee is verified
 * server-side (exists, staff role, active) before anything is written.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });
const revalidate = () => {
  revalidatePath("/admin/agenda");
  revalidatePath("/equipe");
  revalidatePath("/commercial/dashboard");
  revalidatePath("/commercial/agenda");
};

export type NewTask = { assignedTo: string; title: string; type: TaskType; dueAt: string; projectId: string | null; notes: string };

export async function createTask(input: NewTask): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const title = String(input.title ?? "").trim();
  const notes = String(input.notes ?? "").trim();
  const due = Date.parse(String(input.dueAt ?? ""));
  if (!isUuid(input.assignedTo) || !title || title.length > 160 || notes.length > 2000) return fail("invalid");
  if (!TASK_TYPES.includes(input.type) || Number.isNaN(due)) return fail("invalid");
  if (input.projectId !== null && !isUuid(input.projectId)) return fail("invalid");

  const supabase = await createClient();
  const { data: assignee } = await supabase.from("profiles").select("*").eq("id", input.assignedTo).in("role", ["commercial", "videaste"]).maybeSingle();
  if (!assignee || assignee.active === false) return fail("notFound");
  if (input.projectId) {
    const { data: project } = await supabase.from("video_projects").select("id").eq("id", input.projectId).maybeSingle();
    if (!project) return fail("notFound");
  }
  const me = await getCurrentUser();
  const { data: created, error } = await supabase.from("tasks").insert({
    assigned_to: input.assignedTo,
    assigned_by: me?.id ?? null,
    title,
    notes: notes || null,
    type: input.type,
    due_at: new Date(due).toISOString(),
    project_id: input.projectId,
  }).select("id, due_at").single();
  if (error) {
    console.error("createTask failed:", error.message);
    return fail("failed");
  }
  revalidate();
  if (created) await notifyTaskAssigned(created.id, input.assignedTo, title, created.due_at);
  return { success: true };
}

/** Done / not done — allowed for the assignee and for admins (checked in the database by set_task_done). */
export async function setTaskDone(id: string, done: boolean): Promise<{ success: true } | Fail> {
  if (!isUuid(id) || typeof done !== "boolean") return fail("invalid");
  if (!(await getCurrentUser())) return fail("forbidden");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_task_done", { p_task: id, p_done: done });
  if (error) {
    console.error("setTaskDone failed:", error.message);
    return fail("failed");
  }
  if (!data) return fail("notFound");
  revalidate();
  return { success: true };
}

export async function deleteTask(id: string): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}
