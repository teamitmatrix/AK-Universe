"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/admin/team";
import { createClient } from "@/lib/supabase/server";
import { VID_EVENT_TYPES } from "./agenda";
import { getVideaste } from "./session";

/*
 * Agenda writes of the Videographer space. Each action re-checks the caller (active videographer) and writes with
 * their session + a filter on their id; RLS (migration 013) refuses any event of someone else and any link to a
 * project that is not assigned to them.
 */

type Result = { success: true } | { success: false; error: "forbidden" | "invalid" | "notFound" | "notReady" | "failed" };
const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};

export type VidEventInput = { title: string; type: string; startsAt: string; durationMinutes: string; projectId: string; location: string; notes: string };

export async function createVideasteEvent(input: VidEventInput): Promise<Result> {
  const me = await getVideaste();
  if (!me) return { success: false, error: "forbidden" };
  const title = text(input?.title, 160);
  const location = text(input?.location, 200);
  const notes = text(input?.notes, 2000);
  const starts = Date.parse(String(input?.startsAt ?? ""));
  const duration = Number(input?.durationMinutes || 60);
  const projectId = String(input?.projectId ?? "") || null;
  if (!title || location === undefined || notes === undefined || !(String(input?.type) in VID_EVENT_TYPES)) return { success: false, error: "invalid" };
  if (Number.isNaN(starts) || !Number.isInteger(duration) || duration < 5 || duration > 1440) return { success: false, error: "invalid" };
  if (projectId !== null && !isUuid(projectId)) return { success: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("agenda_events").insert({
    salesperson_id: me.id,
    title,
    type: input.type,
    starts_at: new Date(starts).toISOString(),
    duration_minutes: duration,
    location,
    notes,
    project_id: projectId,
  });
  if (error) {
    if (/(project_id|row-level security|check constraint)/i.test(error.message)) return { success: false, error: projectId ? "notFound" : "notReady" };
    console.error("createVideasteEvent failed:", error.message);
    return { success: false, error: "failed" };
  }
  revalidatePath("/videaste/agenda");
  return { success: true };
}

export async function deleteVideasteEvent(id: string): Promise<Result> {
  const me = await getVideaste();
  if (!me) return { success: false, error: "forbidden" };
  if (!isUuid(id)) return { success: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("agenda_events").delete().eq("id", id).eq("salesperson_id", me.id).select("id");
  if (error) return { success: false, error: "failed" };
  if (!data?.length) return { success: false, error: "notFound" };
  revalidatePath("/videaste/agenda");
  return { success: true };
}
