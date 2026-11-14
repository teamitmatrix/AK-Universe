"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/admin/team";
import { createClient } from "@/lib/supabase/server";
import { getVideaste } from "./session";
import { isStage, type Stage } from "./stages";
import { isFileCategory, providerOf, type FileCategory } from "./storage";

/*
 * Project writes of the Videographer space (handoff pages 04 / 07 / 08). Server actions are public HTTP endpoints:
 * each one re-checks the caller (active videographer, read from the database), validates every value here, and the
 * database re-checks again — RLS through is_project_videaste() for inserts / deletes, and SECURITY DEFINER functions
 * (set_project_stage, send_version_for_validation, set_feedback_status) that re-validate the assignment and the
 * transition. A project id sent by the browser is never taken at face value.
 */

type ErrorCode = "forbidden" | "invalid" | "notFound" | "transition" | "notReady" | "failed";
type Result = { success: true } | { success: false; error: ErrorCode };
const fail = (error: ErrorCode): Result => ({ success: false, error });

function refresh(projectId?: string) {
  revalidatePath("/videaste/dashboard");
  revalidatePath("/videaste/mes-projets");
  revalidatePath("/videaste/a-monter");
  revalidatePath("/videaste/retours-clients");
  revalidatePath("/videaste/fichiers");
  if (projectId) revalidatePath("/videaste/projet");
}

/** Maps a database error to a user-facing code (missing 013 objects → notReady). */
function dbError(message: string, where: string): Result {
  if (/transition_refused/.test(message)) return fail("transition");
  if (/(does not exist|schema cache|Could not find)/i.test(message)) return fail("notReady");
  console.error(`${where} failed:`, message);
  return fail("failed");
}

/** The project exists and is assigned to the caller (RLS-scoped read, plus an explicit filter on their id). */
async function ownsProject(supabase: Awaited<ReturnType<typeof createClient>>, meId: string, projectId: string) {
  const { data } = await supabase.from("video_projects").select("id").eq("id", projectId).eq("videaste_id", meId).maybeSingle();
  return Boolean(data);
}

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};

// ---------- Stage ----------

export async function setProjectStage(projectId: string, stage: Stage): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  if (!isUuid(projectId) || !isStage(stage)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_project_stage", { p_project: projectId, p_stage: stage });
  if (error) return dbError(error.message, "setProjectStage");
  if (!data) return fail("notFound");
  refresh(projectId);
  return { success: true };
}

// ---------- Brief ----------

export type BriefInput = {
  objective: string;
  main_message: string;
  audience: string;
  style: string;
  style_references: string;
  call_to_action: string;
  extra_notes: string;
  video_type: string;
  duration: string;
  format: string;
  resolution: string;
  video_count: string;
  platform: string;
};

const BRIEF_LIMITS: Record<Exclude<keyof BriefInput, "video_count">, number> = {
  objective: 1000,
  main_message: 1000,
  audience: 500,
  style: 500,
  style_references: 1000,
  call_to_action: 300,
  extra_notes: 2000,
  video_type: 80,
  duration: 40,
  format: 40,
  resolution: 40,
  platform: 80,
};

export async function saveBrief(projectId: string, input: BriefInput): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  if (!isUuid(projectId) || !input || typeof input !== "object") return fail("invalid");

  const row: Record<string, string | number | null> = { project_id: projectId, updated_by: me.id };
  for (const [key, max] of Object.entries(BRIEF_LIMITS)) {
    const v = text((input as Record<string, unknown>)[key], max);
    if (v === undefined) return fail("invalid");
    row[key] = v;
  }
  const count = String(input.video_count ?? "").trim();
  if (count && !/^\d{1,3}$/.test(count)) return fail("invalid");
  row.video_count = count ? Number(count) : null;
  if (row.video_count !== null && ((row.video_count as number) < 1 || (row.video_count as number) > 100)) return fail("invalid");

  const supabase = await createClient();
  if (!(await ownsProject(supabase, me.id, projectId))) return fail("notFound");
  const { error } = await supabase.from("project_briefs").upsert(row, { onConflict: "project_id" });
  if (error) return dbError(error.message, "saveBrief");
  refresh(projectId);
  return { success: true };
}

// ---------- File links ----------

export async function addProjectFile(projectId: string, input: { category: FileCategory; name: string; url: string }): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  const name = text(input?.name, 160);
  const provider = providerOf(input?.url);
  if (!isUuid(projectId) || !isFileCategory(input?.category) || !name || !provider) return fail("invalid");

  const supabase = await createClient();
  if (!(await ownsProject(supabase, me.id, projectId))) return fail("notFound");
  const { error } = await supabase
    .from("project_files")
    .insert({ project_id: projectId, category: input.category, name, external_url: String(input.url).trim(), provider, added_by: me.id });
  if (error) return dbError(error.message, "addProjectFile");
  refresh(projectId);
  return { success: true };
}

/** Removes a link the videographer added themselves (RLS: own link on an assigned project). */
export async function deleteProjectFile(fileId: string): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  if (!isUuid(fileId)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_files").delete().eq("id", fileId).eq("added_by", me.id).select("project_id");
  if (error) return dbError(error.message, "deleteProjectFile");
  if (!data?.length) return fail("notFound");
  refresh(data[0].project_id as string);
  return { success: true };
}

// ---------- Versions ----------

export async function addVersion(projectId: string, input: { label: string; url: string; notes: string }): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  const label = text(input?.label, 80);
  const notes = text(input?.notes, 1000);
  const provider = providerOf(input?.url);
  if (!isUuid(projectId) || label === undefined || notes === undefined || !provider) return fail("invalid");

  const supabase = await createClient();
  if (!(await ownsProject(supabase, me.id, projectId))) return fail("notFound");
  // number is set by the database (V1, V2…); status starts as a draft (enforced by RLS).
  const { error } = await supabase
    .from("project_versions")
    .insert({ project_id: projectId, number: 0, label, notes, external_url: String(input.url).trim(), provider, author_id: me.id, status: "brouillon" });
  if (error) return dbError(error.message, "addVersion");
  refresh(projectId);
  return { success: true };
}

export async function deleteVersion(versionId: string): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  if (!isUuid(versionId)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_versions").delete().eq("id", versionId).eq("author_id", me.id).eq("status", "brouillon").select("project_id");
  if (error) return dbError(error.message, "deleteVersion");
  if (!data?.length) return fail("notFound");
  refresh(data[0].project_id as string);
  return { success: true };
}

/** "Envoyer à validation": the draft becomes "envoyée" and the project moves to "À faire valider". */
export async function sendVersion(versionId: string): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  if (!isUuid(versionId)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_version_for_validation", { p_version: versionId });
  if (error) return dbError(error.message, "sendVersion");
  if (!data) return fail("notFound");
  refresh(data as string);
  revalidatePath("/admin/projets-video");
  return { success: true };
}

// ---------- Client feedback ----------

export async function setFeedbackStatus(feedbackId: string, status: "a_traiter" | "en_cours" | "corrige"): Promise<Result> {
  const me = await getVideaste();
  if (!me) return fail("forbidden");
  if (!isUuid(feedbackId) || !["a_traiter", "en_cours", "corrige"].includes(status)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_feedback_status", { p_feedback: feedbackId, p_status: status });
  if (error) return dbError(error.message, "setFeedbackStatus");
  if (!data) return fail("notFound");
  refresh();
  return { success: true };
}
