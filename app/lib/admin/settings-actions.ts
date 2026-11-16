"use server";

import { audit } from "./audit";
import { revalidatePath } from "next/cache";
import { sendAuthEmail } from "@/lib/auth/emails";
import { isStrongPassword } from "@/lib/auth/password";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { COMPANY_FIELDS, COMPANY_KEY, type CompanyField } from "@/lib/company";
import { NOTIFICATIONS_KEY, NOTIFICATION_IDS, type TeamNotifications } from "@/lib/notifications";
import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";

/** Paramètres writes. Each action re-checks the admin role; every value is validated here. */

type Fail = { success: false; error: "forbidden" | "invalid" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });

/** Mon profil: the admin's own name and phone (RLS "profiles: update own" forbids touching the role). */
export async function updateMyProfile(input: { firstName: string; lastName: string; phone: string }): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const first = String(input.firstName ?? "").trim();
  const last = String(input.lastName ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  if (first.length > 80 || last.length > 80) return fail("invalid");
  if (phone && !/^[+0-9 ().-]{4,40}$/.test(phone)) return fail("invalid");
  const me = await getCurrentUser();
  if (!me) return fail("forbidden");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ first_name: first || null, last_name: last || null, phone: phone || null })
    .eq("id", me.id);
  if (error) {
    console.error("updateMyProfile failed:", error.message);
    return fail("failed");
  }
  revalidatePath("/admin", "layout");
  return { success: true };
}

type PasswordFail = { success: false; error: Fail["error"] | "wrongCurrent" | "weak" | "same" };

/** Mon profil: new password, only after the current one is re-checked (a stolen open session alone cannot change it). */
export async function changeMyPassword(input: { current: string; next: string }): Promise<{ success: true } | PasswordFail> {
  if (!(await isAdmin())) return fail("forbidden");
  const me = await getCurrentUser();
  if (!me?.email) return fail("forbidden");
  const current = String(input.current ?? "");
  const next = String(input.next ?? "");
  if (!isStrongPassword(next) || next.length > 72) return { success: false, error: "weak" };
  if (next === current) return { success: false, error: "same" };

  // Throw-away client: checking the password must not replace this browser's session cookie.
  const { data: check, error: checkError } = await createPublicClient().auth.signInWithPassword({ email: me.email, password: current });
  if (checkError || check.user?.id !== me.id) return { success: false, error: "wrongCurrent" };
  const admin = createAdminClient();
  if (check.session) await admin.auth.admin.signOut(check.session.access_token, "local");

  const { error } = await admin.auth.admin.updateUserById(me.id, { password: next });
  if (error) {
    console.error("changeMyPassword failed:", error.message);
    return fail("failed");
  }
  await sendAuthEmail("password_changed", me, "");
  await audit("profile.password", me.id);
  return { success: true };
}

const RULES: Partial<Record<CompanyField, RegExp>> = {
  siren: /^\d{3} ?\d{3} ?\d{3}$/,
  siret: /^\d{3} ?\d{3} ?\d{3} ?\d{5}$/,
  vat: /^[A-Z]{2}[0-9A-Z]{2,13}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  website: /^https?:\/\/[^\s]+$/,
  phone: /^[+0-9 ().-]{6,25}$/,
};

/** Entreprise: legal identity shown on the legal pages, contact page and e-mails (merged over config/company.ts). */
export async function saveCompany(input: Partial<Record<CompanyField, string>>): Promise<{ success: true } | { success: false; error: Fail["error"]; field?: CompanyField }> {
  if (!(await isAdmin())) return fail("forbidden");
  const value: Record<string, string> = {};
  for (const key of COMPANY_FIELDS) {
    const v = String(input[key] ?? "").trim();
    if (v.length > 300) return { success: false, error: "invalid", field: key };
    if (v && RULES[key] && !RULES[key]!.test(key === "vat" ? v.replace(/\s/g, "").toUpperCase() : v)) return { success: false, error: "invalid", field: key };
    if (v) value[key] = key === "vat" ? v.replace(/\s/g, "").toUpperCase() : v;
  }
  value.updatedAt = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const supabase = await createClient();
  const me = await getCurrentUser();
  // RLS (site_settings: admin insert/update) re-checks the admin role in the database.
  const { error } = await supabase.from("site_settings").upsert({ key: COMPANY_KEY, value, updated_at: new Date().toISOString(), updated_by: me?.id });
  if (error) {
    console.error("saveCompany failed:", error.message);
    return fail("failed");
  }
  for (const path of ["/admin/parametres", "/mentions-legales", "/confidentialite", "/cgv", "/contact"]) revalidatePath(path);
  await audit("company.save", "company", value);
  return { success: true };
}

/** Notifications: which team e-mails are sent (read by lib/projects/emails.ts). */
export async function saveNotifications(input: TeamNotifications): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const value = Object.fromEntries(NOTIFICATION_IDS.map((id) => [id, input?.[id] === true]));
  const supabase = await createClient();
  const me = await getCurrentUser();
  const { error } = await supabase.from("private_settings").upsert({ key: NOTIFICATIONS_KEY, value, updated_at: new Date().toISOString(), updated_by: me?.id });
  if (error) {
    console.error("saveNotifications failed:", error.message);
    return fail("failed");
  }
  revalidatePath("/admin/parametres");
  await audit("notifications.save", "team_notifications", value);
  return { success: true };
}
