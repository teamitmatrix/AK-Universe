"use server";

import { audit } from "./audit";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/supabase/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isUuid, type StaffRole } from "./team";
import { syncProjectProspect } from "@/lib/commercial/project-prospects";
import { notifyLeadAssigned, notifyProjectAssigned } from "@/lib/notify";

/**
 * Team management writes (admin space). Every action independently re-checks that the caller is an active admin,
 * validates every value on the server, and verifies any person it touches exists with the expected role —
 * nothing sent by the browser is trusted. RLS ("profiles: admin updates", "video_projects: admin updates",
 * migration 005) re-checks the admin role in the database as well.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "noAccount" | "isAdmin" | "otherRole" | "notFound" | "failed" | "inviteFailed" };
type Result = { success: true } | Fail;

const ROLES: StaffRole[] = ["commercial", "videaste"];
const fail = (error: Fail["error"]): Fail => ({ success: false, error });
/** Case-insensitive exact match: `_` and `%` in an e-mail must not act as LIKE wildcards. */
const likeEscape = (v: string) => v.replace(/[\\%_]/g, (m) => `\\${m}`);

function revalidateTeam() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/commerciaux");
  revalidatePath("/admin/videastes");
  revalidatePath("/admin/commercial-detail");
  revalidatePath("/admin/videaste-detail");
  revalidatePath("/admin");
}

const cleanText = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};
const parseOptionalNumber = (v: string, max: number) => {
  const raw = String(v ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
};

/** Gives an existing account (found by e-mail) the commercial or videaste role. Never creates accounts. */
export async function addStaffMember(email: string, role: StaffRole): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  const clean = String(email ?? "").trim().toLowerCase();
  if (!ROLES.includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) return fail("invalid");

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, role").ilike("email", likeEscape(clean)).maybeSingle();
  if (!profile) return fail("noAccount");
  if (profile.role === "admin") return fail("isAdmin");
  if (profile.role !== "user" && profile.role !== role) return fail("otherRole");

  const { error } = await supabase.from("profiles").update({ role, active: true }).eq("id", profile.id);
  if (error) {
    console.error("addStaffMember failed:", error.message);
    return fail("failed");
  }
  revalidateTeam();
  await audit("staff.add", clean, { role });
  return { success: true };
}

export type CreateCommercialInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  targetEuros: string;
  ratePercent: string;
};

/**
 * Creates a sales rep: invites a new account (name + phone + rate/target) or promotes an existing one and
 * fills identity fields. Matches the handoff "create/edit sales reps (name, email, phone, status, rate, target)".
 */
export async function createCommercial(input: CreateCommercialInput): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  const email = String(input.email ?? "").trim().toLowerCase();
  const first = cleanText(input.firstName, 80);
  const last = cleanText(input.lastName, 80);
  const phone = cleanText(input.phone, 40);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail("invalid");
  if (first === undefined || last === undefined || phone === undefined) return fail("invalid");
  if (phone && !/^[+0-9 ().-]{4,40}$/.test(phone)) return fail("invalid");
  if (!first && !last) return fail("invalid");
  const target = parseOptionalNumber(input.targetEuros, 10_000_000);
  const rate = parseOptionalNumber(input.ratePercent, 100);
  if (target === undefined || rate === undefined) return fail("invalid");

  const patch = {
    role: "commercial" as const,
    active: true,
    first_name: first,
    last_name: last,
    phone,
    monthly_target_cents: target === null ? null : Math.round(target * 100),
    commission_rate: rate === null ? null : Math.round(rate * 100) / 100,
  };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id, role").ilike("email", likeEscape(email)).maybeSingle();
  if (existing) {
    if (existing.role === "admin") return fail("isAdmin");
    if (existing.role !== "user" && existing.role !== "commercial") return fail("otherRole");
    const { error } = await supabase.from("profiles").update(patch).eq("id", existing.id);
    if (error) {
      console.error("createCommercial promote failed:", error.message);
      return fail(/phone/.test(error.message) ? "failed" : "failed");
    }
    revalidateTeam();
    await audit("staff.add", email, { role: "commercial", created: false });
    return { success: true };
  }

  try {
    const admin = createAdminClient();
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: first ?? "", last_name: last ?? "" },
      redirectTo: `${getSiteUrl()}/connexion`,
    });
    if (inviteErr || !invited.user) {
      console.error("createCommercial invite failed:", inviteErr?.message);
      return fail("inviteFailed");
    }
    // The auth trigger creates the profile row; fill role + sales fields.
    const { error } = await supabase.from("profiles").update(patch).eq("id", invited.user.id);
    if (error) {
      console.error("createCommercial profile update failed:", error.message);
      return fail("failed");
    }
  } catch (cause) {
    console.error("createCommercial failed:", cause);
    return fail("failed");
  }

  revalidateTeam();
  await audit("staff.add", email, { role: "commercial", created: true });
  return { success: true };
}

/** Name and phone of a sales rep (detail page). Rate / target stay in updateCommercialSettings. */
export async function updateCommercialProfile(id: string, input: { firstName: string; lastName: string; phone: string }): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const first = cleanText(input.firstName, 80);
  const last = cleanText(input.lastName, 80);
  const phone = cleanText(input.phone, 40);
  if (first === undefined || last === undefined || phone === undefined) return fail("invalid");
  if (phone && !/^[+0-9 ().-]{4,40}$/.test(phone)) return fail("invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ first_name: first, last_name: last, phone })
    .eq("id", id)
    .eq("role", "commercial")
    .select("id");
  if (error) {
    console.error("updateCommercialProfile failed:", error.message);
    return fail(/phone/.test(error.message) ? "failed" : "failed");
  }
  if (!data?.length) return fail("notFound");
  revalidateTeam();
  await audit("staff.profile", id, { phone: Boolean(phone) });
  return { success: true };
}

/** Monthly target (euros excl. VAT) and commission rate (%) of a sales rep. Empty = not set. */
export async function updateCommercialSettings(id: string, input: { targetEuros: string; ratePercent: string }): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");

  const parse = (v: string, max: number) => {
    const raw = String(v ?? "").trim().replace(",", ".");
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
  };
  const target = parse(input.targetEuros, 10_000_000);
  const rate = parse(input.ratePercent, 100);
  if (target === undefined || rate === undefined) return fail("invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ monthly_target_cents: target === null ? null : Math.round(target * 100), commission_rate: rate === null ? null : Math.round(rate * 100) / 100 })
    .eq("id", id)
    .eq("role", "commercial")
    .select("id");
  if (error) {
    console.error("updateCommercialSettings failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("notFound");
  revalidateTeam();
  await audit("staff.settings", id, { targetEuros: target, ratePercent: rate });
  return { success: true };
}

/** Deactivates / reactivates a team member. A deactivated member is no longer offered for assignments. */
export async function setStaffActive(id: string, active: boolean): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(id) || typeof active !== "boolean") return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ active }).eq("id", id).in("role", ROLES).select("id");
  if (error) {
    console.error("setStaffActive failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("notFound");
  revalidateTeam();
  await audit(active ? "staff.activate" : "staff.deactivate", id);
  return { success: true };
}

export type ProjectAssignment = {
  commercialId: string | null;
  videasteId: string | null;
  deadline: string | null;
  revisionRounds: number | null;
};

/**
 * Assigns a video project to a sales rep and/or a videographer, with a deadline and the number of
 * client revision rounds. Each assignee must exist, hold that role and be active.
 */
export async function assignProject(projectId: string, input: ProjectAssignment): Promise<Result> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(projectId)) return fail("invalid");
  const { commercialId, videasteId, deadline, revisionRounds } = input;
  if (commercialId !== null && !isUuid(commercialId)) return fail("invalid");
  if (videasteId !== null && !isUuid(videasteId)) return fail("invalid");
  if (deadline !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline)))) return fail("invalid");
  if (revisionRounds !== null && (!Number.isInteger(revisionRounds) || revisionRounds < 0 || revisionRounds > 50)) return fail("invalid");

  const supabase = await createClient();
  const ids = [commercialId, videasteId].filter((x): x is string => x !== null);
  if (ids.length) {
    const { data: people } = await supabase.from("profiles").select("*").in("id", ids);
    const ok = (id: string | null, role: StaffRole) =>
      id === null || (people ?? []).some((p) => p.id === id && p.role === role && p.active !== false);
    if (!ok(commercialId, "commercial") || !ok(videasteId, "videaste")) return fail("notFound");
  }

  const update: Record<string, unknown> = { commercial_id: commercialId, videaste_id: videasteId, deadline };
  // revision_rounds only exists after migration 006: leave it out when not provided.
  if (revisionRounds !== null) update.revision_rounds = revisionRounds;
  const { data, error } = await supabase.from("video_projects").update(update).eq("id", projectId).select("id");
  if (error) {
    console.error("assignProject failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("notFound");
  revalidateTeam();
  await syncProjectProspect(projectId, commercialId);
  await notifyLeadAssigned(projectId, commercialId);
  await notifyProjectAssigned(projectId, videasteId);
  return { success: true };
}
