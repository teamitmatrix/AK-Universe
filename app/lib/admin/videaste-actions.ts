"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/session";
import { notifyProjectAssigned, notifyVersionReviewed } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { parseProfileInput, type ProfileInput } from "@/lib/videaste/profile";
import { isStage, type Stage } from "@/lib/videaste/stages";
import { audit } from "./audit";
import { isUuid } from "./team";

/*
 * Admin — videographer & project management (Espace Vidéaste handoff, page 10). Every action re-checks that the
 * caller is an ACTIVE ADMIN on the server (isAdmin reads profiles on each call — never a browser flag), validates
 * every value, and writes with the admin's session so RLS / the database functions re-check the admin role again.
 */

type ErrorCode = "forbidden" | "invalid" | "notFound" | "transition" | "notReady" | "commentRequired" | "failed";
type Result = { success: true } | { success: false; error: ErrorCode };
const fail = (error: ErrorCode): Result => ({ success: false, error });

function revalidateAll() {
  revalidatePath("/admin/projets-video");
  revalidatePath("/admin/videastes");
  revalidatePath("/admin/videaste-detail");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin");
  for (const p of ["dashboard", "mes-projets", "projet", "a-monter", "retours-clients", "fichiers", "agenda"]) revalidatePath(`/videaste/${p}`);
}

function dbError(message: string, where: string): Result {
  if (/transition_refused/.test(message)) return fail("transition");
  if (/comment_required/.test(message)) return fail("commentRequired");
  if (/(does not exist|schema cache|Could not find)/i.test(message)) return fail("notReady");
  console.error(`${where} failed:`, message);
  return fail("failed");
}

/** Inline reassignment from the company-wide project table. The new videographer must exist, be one, and be active. */
export async function reassignProjectVideaste(projectId: string, videasteId: string | null): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(projectId) || (videasteId !== null && !isUuid(videasteId))) return fail("invalid");
  const supabase = await createClient();
  if (videasteId) {
    const { data: person } = await supabase.from("profiles").select("*").eq("id", videasteId).maybeSingle();
    if (!person || person.role !== "videaste" || person.active === false) return fail("notFound");
  }
  const { data, error } = await supabase.from("video_projects").update({ videaste_id: videasteId }).eq("id", projectId).select("id");
  if (error) return dbError(error.message, "reassignProjectVideaste");
  if (!data?.length) return fail("notFound");
  revalidateAll();
  await audit("project.reassign_videaste", projectId, { videasteId });
  await notifyProjectAssigned(projectId, videasteId);
  return { success: true };
}

/** Production stage of any project (admins may set any stage; set_project_stage re-checks the role). */
export async function setProjectStageAdmin(projectId: string, stage: Stage): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(projectId) || !isStage(stage)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_project_stage", { p_project: projectId, p_stage: stage });
  if (error) return dbError(error.message, "setProjectStageAdmin");
  if (!data) return fail("notFound");
  revalidateAll();
  await audit("project.stage", projectId, { stage });
  return { success: true };
}

/**
 * The client's answer on a version sent for validation, recorded by an admin (there is no client portal yet).
 * "Validée" → project "Validé"; "Modifications" (comment required) → project "Modifications", +1 revision round and
 * a client feedback the videographer handles in "Retours clients". Done in ONE database transaction (respond_to_version).
 */
export async function respondToVersion(versionId: string, decision: "validee" | "modifications", comment: string): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  const clean = String(comment ?? "").trim();
  if (!isUuid(versionId) || !["validee", "modifications"].includes(decision) || clean.length > 2000) return fail("invalid");
  if (decision === "modifications" && !clean) return fail("commentRequired");
  const supabase = await createClient();
  const { data: projectId, error } = await supabase.rpc("respond_to_version", { p_version: versionId, p_decision: decision, p_comment: clean || null });
  if (error) return dbError(error.message, "respondToVersion");
  if (!projectId) return fail("notFound");

  const [{ data: version }, { data: project }] = await Promise.all([
    supabase.from("project_versions").select("number, label").eq("id", versionId).maybeSingle(),
    supabase.from("video_projects").select("videaste_id").eq("id", projectId as string).maybeSingle(),
  ]);
  revalidateAll();
  await audit("project.version_response", projectId as string, { versionId, decision });
  await notifyVersionReviewed(versionId, projectId as string, (project?.videaste_id as string | null) ?? null, decision, (version?.label as string | null) || `V${version?.number ?? ""}`);
  return { success: true };
}

/** Name, phone and specialties of a videographer (detail page). Activation stays in setStaffActive. */
export async function updateVideasteProfile(id: string, input: ProfileInput): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const row = parseProfileInput(input);
  if (!row) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(row).eq("id", id).eq("role", "videaste").select("id");
  if (error) return /(phone|specialties)/.test(error.message) ? fail("notReady") : dbError(error.message, "updateVideasteProfile");
  if (!data?.length) return fail("notFound");
  revalidateAll();
  await audit("staff.profile", id, { phone: Boolean(row.phone), specialties: row.specialties.length });
  return { success: true };
}
