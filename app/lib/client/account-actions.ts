"use server";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendAuthEmail } from "@/lib/auth/emails";
import { isStrongPassword } from "@/lib/auth/password";
import { sendResetEmail } from "@/lib/auth/reset-password";
import { emailConfigured, emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { isCountry } from "./countries";
import { getClientMe } from "./session";

/*
 * "Mon compte" actions. Server actions are public endpoints, so each one re-checks the caller (active customer,
 * 2FA passed when enabled — getClientMe) and only touches the caller's own data:
 *   - profile and preferences → the caller's profiles row, with their own session (RLS "profiles: update own",
 *     which also locks role / active);
 *   - password → the current password is checked first, then Supabase Auth (admin API) stores the new one
 *     (hashed by Supabase — never by us); a security notice is e-mailed;
 *   - e-mail → re-authentication, then a 6-digit code is sent to the NEW address (kept only as an HMAC, 15 min,
 *     5 attempts); the account address changes only once that code is entered; a notice goes to the old address;
 *   - deletion → typed confirmation + re-authentication; subscriptions are cancelled in Stripe first; the account
 *     and personal data are deleted; payment records stay (legal retention) without link to the person.
 * None of these writes a session cookie, so they are safe as server actions (see /api/auth/otp).
 */

type Fail<E extends string> = { success: false; error: E | "forbidden" | "failed" };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_TTL_MS = 15 * 60_000;
const CODE_GAP_MS = 60_000;
const MAX_ATTEMPTS = 5;
const RECENT_SIGN_IN_MS = 15 * 60_000;

function codeSecret() {
  const base = process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Missing AUTH_SECRET (or SUPABASE_SERVICE_ROLE_KEY).");
  return createHmac("sha256", "aku-email-change").update(base).digest();
}
const hashCode = (uid: string, email: string, code: string) => createHmac("sha256", codeSecret()).update(`${uid}:${email}:${code}`).digest("hex");

/** The caller's auth user (fresh from the Auth server, not the cookie). */
async function authUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Re-authentication: the current password when the account has one; otherwise (Google / Apple sign-in only) a
 * sign-in less than 15 minutes old.
 */
async function reauthenticate(password: unknown): Promise<"ok" | "password_invalid" | "reauth_required"> {
  const user = await authUser();
  if (!user?.email) return "reauth_required";
  const hasPassword = Boolean(user.identities?.some((i) => i.provider === "email"));
  if (!hasPassword) {
    const last = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    return Date.now() - last < RECENT_SIGN_IN_MS ? "ok" : "reauth_required";
  }
  if (typeof password !== "string" || !password) return "password_invalid";
  // Checked on a throw-away client (no cookie written), then that extra session is revoked.
  const { data, error } = await createPublicClient().auth.signInWithPassword({ email: user.email, password });
  if (error || !data.session) return "password_invalid";
  await createAdminClient().auth.admin.signOut(data.session.access_token, "local").catch(() => undefined);
  return "ok";
}

function done() {
  revalidatePath("/dashboard", "layout");
}

/* ---------------- Profile ---------------- */

export type ProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

export async function saveAccountProfile(input: ProfileInput): Promise<{ success: true } | (Fail<"invalid" | "notReady"> & { field?: keyof ProfileInput })> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const v = {
    first_name: clean(input.firstName, 60),
    last_name: clean(input.lastName, 60),
    phone: clean(input.phone, 40),
    company_name: clean(input.company, 120),
    address_line1: clean(input.addressLine1, 160),
    address_line2: clean(input.addressLine2, 160),
    postal_code: clean(input.postalCode, 20),
    city: clean(input.city, 80),
    country: clean(input.country, 2).toUpperCase(),
  };
  if (!v.first_name) return { success: false, error: "invalid", field: "firstName" };
  if (!v.last_name) return { success: false, error: "invalid", field: "lastName" };
  if (v.phone && !/^[+\d][\d\s().-]{5,}$/.test(v.phone)) return { success: false, error: "invalid", field: "phone" };
  if (v.country && !isCountry(v.country)) return { success: false, error: "invalid", field: "country" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val || null])), first_name: v.first_name, last_name: v.last_name })
    .eq("id", me.id)
    .select("id");
  if (error) {
    if (/(company_name|address_line1|postal_code|country|column)/.test(error.message)) return { success: false, error: "notReady" };
    console.error("saveAccountProfile failed:", error.message);
    return { success: false, error: "failed" };
  }
  if (!data?.length) return { success: false, error: "failed" };
  done();
  return { success: true };
}

/* ---------------- Notification preferences ---------------- */

export async function saveNotificationPrefs(input: { billing?: unknown; news?: unknown; subscription?: unknown }): Promise<{ success: true } | Fail<"invalid" | "notReady">> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  if (typeof input.billing !== "boolean" || typeof input.news !== "boolean" || typeof input.subscription !== "boolean") return { success: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ notification_prefs: { billing: input.billing, news: input.news, subscription: input.subscription } })
    .eq("id", me.id)
    .select("id");
  if (error) {
    if (/notification_prefs/.test(error.message)) return { success: false, error: "notReady" };
    console.error("saveNotificationPrefs failed:", error.message);
    return { success: false, error: "failed" };
  }
  if (!data?.length) return { success: false, error: "failed" };
  done();
  return { success: true };
}

/* ---------------- Password ---------------- */

export async function changePassword(input: { current?: string; next?: string }): Promise<{ success: true } | Fail<"password_invalid" | "weak" | "same" | "no_password">> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const user = await authUser();
  if (!user?.identities?.some((i) => i.provider === "email")) return { success: false, error: "no_password" };
  const next = typeof input.next === "string" ? input.next : "";
  if (!isStrongPassword(next) || next.length > 72) return { success: false, error: "weak" };
  if (next === input.current) return { success: false, error: "same" };
  if ((await reauthenticate(input.current)) !== "ok") return { success: false, error: "password_invalid" };

  const { error } = await createAdminClient().auth.admin.updateUserById(me.id, { password: next });
  if (error) {
    console.error("changePassword failed:", error.message);
    return { success: false, error: /weak|password/i.test(error.message) ? "weak" : "failed" };
  }
  if (emailConfigured()) await sendAuthEmail("password_changed", user, "").catch(() => undefined);
  return { success: true };
}

/** Accounts created with Google / Apple: e-mail a link to set a password (existing reset flow). */
export async function sendPasswordSetupLink(): Promise<{ success: true } | Fail<never>> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const res = await sendResetEmail(me.email);
  return res.success ? { success: true } : { success: false, error: "failed" };
}

/* ---------------- E-mail address ---------------- */

export async function startEmailChange(input: { email?: string; password?: string }): Promise<
  { success: true; mode: "code" | "provider" } | Fail<"invalid" | "same" | "taken" | "password_invalid" | "reauth_required" | "rate_limited" | "notReady">
> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const email = clean(input.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return { success: false, error: "invalid" };
  if (email === me.email.toLowerCase()) return { success: false, error: "same" };

  const reauth = await reauthenticate(input.password);
  if (reauth !== "ok") return { success: false, error: reauth };

  const admin = createAdminClient();
  const { data: taken } = await admin.from("profiles").select("id").eq("email", email).neq("id", me.id).limit(1);
  if (taken?.length) return { success: false, error: "taken" };

  // Without our e-mail sender, Supabase runs its own e-mail change (confirmation links sent by Supabase).
  if (!emailConfigured()) {
    const { error } = await (await createClient()).auth.updateUser({ email });
    if (error) return { success: false, error: /already|exists|registered/i.test(error.message) ? "taken" : "failed" };
    return { success: true, mode: "provider" };
  }

  const { data: existing, error: readErr } = await admin.from("account_email_changes").select("created_at").eq("user_id", me.id).maybeSingle();
  if (readErr) return { success: false, error: "notReady" };
  if (existing && Date.now() - new Date(existing.created_at as string).getTime() < CODE_GAP_MS) return { success: false, error: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  const { error } = await admin.from("account_email_changes").upsert(
    { user_id: me.id, new_email: email, code_hash: hashCode(me.id, email, code), attempts: 0, expires_at: new Date(now.getTime() + CODE_TTL_MS).toISOString(), created_at: now.toISOString() },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("startEmailChange failed:", error.message);
    return { success: false, error: "failed" };
  }
  const sent = await sendEmail({
    to: email,
    subject: `${code} — confirmez votre nouvelle adresse e-mail AK Universe`,
    html: emailLayout(
      "Confirmez votre nouvelle adresse e-mail",
      `<p style="margin:0 0 20px">Pour utiliser cette adresse sur votre compte AK Universe, saisissez ce code dans votre espace client :</p>
<p style="margin:0 0 8px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#fdb942">${escapeHtml(code)}</p>
<p style="margin:16px 0 0;color:#a89c8e;font-size:13px">Ce code est personnel et valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`
    ),
    text: `Code de confirmation de votre nouvelle adresse e-mail AK Universe : ${code}\nValable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
  });
  if (!sent) {
    await admin.from("account_email_changes").delete().eq("user_id", me.id);
    return { success: false, error: "failed" };
  }
  return { success: true, mode: "code" };
}

export async function confirmEmailChange(input: { code?: string }): Promise<{ success: true; email: string } | Fail<"invalid" | "expired" | "code_invalid" | "too_many" | "taken">> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const code = clean(input.code, 6);
  if (!/^\d{6}$/.test(code)) return { success: false, error: "invalid" };

  const admin = createAdminClient();
  const { data: row } = await admin.from("account_email_changes").select("*").eq("user_id", me.id).maybeSingle();
  if (!row || new Date(row.expires_at as string) <= new Date()) return { success: false, error: "expired" };
  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    await admin.from("account_email_changes").delete().eq("user_id", me.id);
    return { success: false, error: "too_many" };
  }
  const expected = Buffer.from(row.code_hash as string, "hex");
  const given = Buffer.from(hashCode(me.id, row.new_email as string, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    // Conditioned on the attempt count read, so parallel guesses cannot skip the limit.
    await admin.from("account_email_changes").update({ attempts: (row.attempts as number) + 1 }).eq("user_id", me.id).eq("attempts", row.attempts as number);
    return { success: false, error: "code_invalid" };
  }

  const newEmail = row.new_email as string;
  const oldEmail = me.email;
  const { error } = await admin.auth.admin.updateUserById(me.id, { email: newEmail, email_confirm: true });
  if (error) {
    console.error("confirmEmailChange failed:", error.message);
    return { success: false, error: /already|exists|registered/i.test(error.message) ? "taken" : "failed" };
  }
  await admin.from("profiles").update({ email: newEmail }).eq("id", me.id);
  await admin.from("account_email_changes").delete().eq("user_id", me.id);
  await sendEmail({
    to: oldEmail,
    subject: "Votre adresse e-mail AK Universe a été modifiée",
    html: emailLayout(
      "Adresse e-mail modifiée",
      `<p style="margin:0">L'adresse de connexion de votre compte AK Universe est désormais <strong>${escapeHtml(newEmail)}</strong>.</p>
<p style="margin:16px 0 0;color:#a89c8e;font-size:13px">Si vous n'êtes pas à l'origine de ce changement, répondez immédiatement à cet e-mail.</p>`
    ),
    text: `L'adresse de connexion de votre compte AK Universe est désormais ${newEmail}.\nSi vous n'êtes pas à l'origine de ce changement, répondez immédiatement à cet e-mail.`,
  });
  done();
  return { success: true, email: newEmail };
}

export async function cancelEmailChange(): Promise<{ success: true } | Fail<never>> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  await createAdminClient().from("account_email_changes").delete().eq("user_id", me.id);
  done();
  return { success: true };
}

/* ---------------- Account deletion ---------------- */

export async function deleteMyAccount(input: { confirm?: string; password?: string }): Promise<
  { success: true } | Fail<"confirm" | "password_invalid" | "reauth_required" | "org_members">
> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  if (clean(input.confirm, 20).toUpperCase() !== "SUPPRIMER") return { success: false, error: "confirm" };
  const reauth = await reauthenticate(input.password);
  if (reauth !== "ok") return { success: false, error: reauth };

  const admin = createAdminClient();

  // An organisation owned by the customer is deleted with the account: refuse while other people belong to it.
  const { data: owned } = await admin.from("organizations").select("id").eq("owner_id", me.id);
  for (const org of owned ?? []) {
    const { count } = await admin.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", org.id).neq("user_id", me.id);
    if (count) return { success: false, error: "org_members" };
  }

  // Billing rule: deleting the account ends every running subscription now — no further charge, the period in
  // progress is not refunded. Done first: if Stripe refuses, nothing is deleted.
  const { data: subs } = await admin.from("subscriptions").select("stripe_subscription_id, stripe_customer_id, status").eq("user_id", me.id);
  const running = (subs ?? []).filter((s) => s.stripe_subscription_id && ["active", "past_due", "incomplete"].includes(s.status as string));
  const stripe = getStripe();
  if (running.length && !stripe) return { success: false, error: "failed" };
  try {
    for (const s of running) {
      const id = s.stripe_subscription_id as string;
      const live = await stripe!.subscriptions.retrieve(id);
      if (live.status !== "canceled" && live.status !== "incomplete_expired") {
        await stripe!.subscriptions.cancel(id, { prorate: false, invoice_now: false }, { idempotencyKey: `account-delete-${id}` });
      }
    }
    // Invoices stay with the payment provider (legal retention); the customer record is only flagged.
    for (const customer of new Set((subs ?? []).map((s) => s.stripe_customer_id as string | null).filter(Boolean) as string[])) {
      await stripe!.customers.update(customer, { metadata: { account_deleted_at: new Date().toISOString() } }).catch(() => undefined);
    }
  } catch (cause) {
    console.error("deleteMyAccount: Stripe cancellation failed:", cause);
    return { success: false, error: "failed" };
  }

  // Deleting the auth user removes the profile and everything attached to it (subscriptions, billing details,
  // memberships, notifications, preferences). Payments and video projects are kept for accounting, unlinked.
  const { error } = await admin.auth.admin.deleteUser(me.id);
  if (error) {
    console.error("deleteMyAccount: delete failed:", error.message);
    return { success: false, error: "failed" };
  }
  await sendEmail({
    to: me.email,
    subject: "Votre compte AK Universe a été supprimé",
    html: emailLayout(
      "Compte supprimé",
      `<p style="margin:0">Votre compte AK Universe et vos données personnelles ont été supprimés${running.length ? ", et votre abonnement a été résilié" : ""}.</p>
<p style="margin:12px 0 0">Vos factures restent conservées par notre prestataire de paiement pendant la durée légale.</p>`
    ),
    text: `Votre compte AK Universe et vos données personnelles ont été supprimés.${running.length ? " Votre abonnement a été résilié." : ""}\nVos factures restent conservées par notre prestataire de paiement pendant la durée légale.`,
  });
  return { success: true };
}
