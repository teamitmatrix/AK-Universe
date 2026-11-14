"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/admin/team";
import { loadMyNotifications, markMine, type Feed } from "@/lib/commercial/notifications";
import { createClient } from "@/lib/supabase/server";
import type { TaskState } from "./dashboard";
import { parseProfileInput, type ProfileInput } from "./profile";
import { getVideaste } from "./session";

/*
 * Server actions of the Videographer space. Server actions are public HTTP endpoints, so each one re-checks the
 * caller itself: an active videographer, read from the database on every call. Whose task / notification is
 * touched is decided by the verified session in the database (auth.uid()), never by an id the browser claims.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "notReady" | "failed" };
const STATES: TaskState[] = ["a_faire", "en_cours", "fait"];

/** Inline status of a task on the dashboard: à faire / en cours / fait. */
export async function setMyTaskState(id: string, state: TaskState): Promise<{ success: true } | Fail> {
  const me = await getVideaste();
  if (!me) return { success: false, error: "forbidden" };
  if (!isUuid(id) || !STATES.includes(state)) return { success: false, error: "invalid" };

  const supabase = await createClient();
  // set_task_progress (migration 013) only updates a task assigned to the caller, while their account is active.
  let { data, error } = await supabase.rpc("set_task_progress", { p_task: id, p_state: state });
  if (error && (error.code === "PGRST202" || /set_task_progress/.test(error.message))) {
    // Before 013: done / not done still works through set_task_done (same ownership check); "en cours" does not exist yet.
    if (state === "en_cours") return { success: false, error: "notReady" };
    ({ data, error } = await supabase.rpc("set_task_done", { p_task: id, p_done: state === "fait" }));
  }
  if (error) {
    console.error("setMyTaskState failed:", error.message);
    return { success: false, error: "failed" };
  }
  if (!data) return { success: false, error: "notFound" };
  revalidatePath("/videaste/dashboard");
  return { success: true };
}

export async function getMyNotifications(): Promise<{ success: true; feed: Feed } | { success: false; error: "forbidden" }> {
  const me = await getVideaste();
  if (!me) return { success: false, error: "forbidden" };
  return { success: true, feed: await loadMyNotifications(me, "/videaste/dashboard") };
}

export async function markNotificationsRead(ids: string[] | null) {
  const me = await getVideaste();
  if (!me) return { success: false as const, error: "forbidden" as const };
  if (ids !== null && (!Array.isArray(ids) || ids.length > 100 || !ids.every(isUuid))) return { success: false as const, error: "invalid" as const };
  return (await markMine(ids)) ? { success: true as const } : { success: false as const, error: "failed" as const };
}

/** The videographer's own profile. RLS ("profiles: update own") forbids touching role / active. */
export async function saveMyProfile(input: ProfileInput) {
  const me = await getVideaste();
  if (!me) return { success: false as const, error: "forbidden" as const };
  const row = parseProfileInput(input);
  if (!row) return { success: false as const, error: "invalid" as const };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(row).eq("id", me.id).select("id");
  if (error) {
    if (/(phone|specialties)/.test(error.message)) return { success: false as const, error: "notReady" as const };
    console.error("saveMyProfile failed:", error.message);
    return { success: false as const, error: "failed" as const };
  }
  if (!data?.length) return { success: false as const, error: "failed" as const };
  revalidatePath("/videaste", "layout");
  return { success: true as const };
}
