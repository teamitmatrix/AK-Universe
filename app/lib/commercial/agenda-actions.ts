"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/admin/team";
import { getCommercial } from "./session";

/*
 * Agenda & task writes of the sales space. Each action re-checks the caller (active rep), validates the input and
 * writes with the rep's session + a filter on the rep's id. RLS (migration 012) refuses anything else:
 * a rep can never read, edit, move or delete another rep's events or tasks — and tasks given by an admin
 * can only be ticked (set_task_done), not edited or deleted.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });
const revalidate = () => {
  revalidatePath("/commercial/agenda");
  revalidatePath("/commercial/dashboard");
};
const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};
const EVENT_TYPES = ["appel", "rdv", "rappel", "visite"];
const PRIORITIES = ["basse", "normale", "haute"];

export type EventInput = { title: string; clientName: string; type: string; startsAt: string; durationMinutes: string; location: string; notes: string };

function parseEvent(input: EventInput) {
  const title = text(input.title, 160);
  const clientName = text(input.clientName, 160);
  const location = text(input.location, 200);
  const notes = text(input.notes, 2000);
  const starts = Date.parse(String(input.startsAt ?? ""));
  const duration = Number(input.durationMinutes || 30);
  if (!title || [clientName, location, notes].includes(undefined) || !EVENT_TYPES.includes(input.type)) return null;
  if (Number.isNaN(starts) || !Number.isInteger(duration) || duration < 5 || duration > 1440) return null;
  return { title, client_name: clientName, type: input.type, starts_at: new Date(starts).toISOString(), duration_minutes: duration, location, notes };
}

export async function saveEvent(id: string | null, input: EventInput): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (id !== null && !isUuid(id)) return fail("invalid");
  const row = parseEvent(input);
  if (!row) return fail("invalid");
  const supabase = await createClient();
  const res = id
    ? await supabase.from("agenda_events").update(row).eq("id", id).eq("salesperson_id", me.id).select("id")
    : await supabase.from("agenda_events").insert({ ...row, salesperson_id: me.id }).select("id");
  if (res.error) {
    console.error("saveEvent failed:", res.error.message);
    return fail("failed");
  }
  if (!res.data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}

export async function setEventStatus(id: string, status: "prevu" | "fait" | "annule"): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id) || !["prevu", "fait", "annule"].includes(status)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("agenda_events").update({ status }).eq("id", id).eq("salesperson_id", me.id).select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}

export async function deleteEvent(id: string): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("agenda_events").delete().eq("id", id).eq("salesperson_id", me.id).select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}

export type OwnTaskInput = { title: string; clientName: string; dueAt: string; priority: string };

/** A task the rep creates for themselves (assigned_to = assigned_by = the rep). */
export async function createOwnTask(input: OwnTaskInput): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  const title = text(input.title, 160);
  const clientName = text(input.clientName, 160);
  const due = Date.parse(String(input.dueAt ?? ""));
  if (!title || clientName === undefined || Number.isNaN(due) || !PRIORITIES.includes(input.priority)) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    assigned_to: me.id,
    assigned_by: me.id,
    title,
    client_name: clientName,
    type: "tache",
    due_at: new Date(due).toISOString(),
    priority: input.priority,
  });
  if (error) {
    console.error("createOwnTask failed:", error.message);
    return fail("failed");
  }
  revalidate();
  return { success: true };
}

/** Only tasks the rep created themselves can be deleted (RLS also enforces it). */
export async function deleteOwnTask(id: string): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).eq("assigned_to", me.id).eq("assigned_by", me.id).select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}
