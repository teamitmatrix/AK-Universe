"use server";

import { emailConfigured } from "@/lib/email";
import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { newEmailCode, sendAuthEmail } from "./emails";
import {
  clearPendingLogin,
  codeStillFresh,
  getPendingLogin,
  isTrustedDevice,
  setPendingLogin,
  trustThisDevice,
} from "./two-factor";

/**
 * Step 1 — password. With e-mail configured (Resend), a correct password does not sign in yet:
 * a 6-digit code is e-mailed (two-factor), unless this browser was trusted with "Se souvenir de moi".
 */
export async function login(email: string, password: string, remember = false, lang?: string) {
  const supabase = await createClient();

  // Without Resend the site keeps working with a plain password sign-in.
  if (!emailConfigured()) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { success: false as const, code: error.code ?? "unknown" } : { success: true as const, step: "done" as const };
  }

  // Check the password on a throw-away client so no session cookie is written yet.
  const { data, error } = await createPublicClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) return { success: false as const, code: error?.code ?? "unknown" };
  const user = data.user;

  if (remember && (await isTrustedDevice(user.id))) {
    await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    return { success: true as const, step: "done" as const };
  }

  await createAdminClient().auth.admin.signOut(data.session.access_token, "local");

  // A second generateLink() invalidates the previous OTP. If this browser already has a fresh
  // pending code (double-submit / Strict Mode / quick re-login), keep it and do not mint another.
  const existing = await getPendingLogin();
  const reuse = existing?.uid === user.id && codeStillFresh(existing);
  if (reuse) {
    await setPendingLogin(user.id, user.email!, remember, existing!.issuedAt);
    return { success: true as const, step: "code" as const, email: user.email! };
  }

  const sent = await sendAuthEmail("login", user, () => newEmailCode(user.email!), lang);
  if (sent === "failed") return { success: false as const, code: "email_failed" };
  // rate_limited: no new code was generated, so an earlier OTP (if any) remains valid.
  if (sent === "sent") await setPendingLogin(user.id, user.email!, remember);
  else await setPendingLogin(user.id, user.email!, remember, existing?.issuedAt);
  return { success: true as const, step: "code" as const, email: user.email! };
}

/** Step 2 — the e-mailed code. Only works after step 1 in the same browser. */
export async function verifyLoginCode(code: string) {
  const pending = await getPendingLogin();
  if (!pending) return { success: false as const, code: "otp_expired" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: pending.email,
    token: code.trim(),
    type: "email",
  });
  if (error || data.user?.id !== pending.uid) {
    if (!error) await supabase.auth.signOut();
    // Supabase returns otp_expired for both wrong and expired tokens; with a live pending
    // cookie the 15-minute window has not elapsed, so treat it as an incorrect code.
    return { success: false as const, code: "otp_invalid" };
  }

  if (pending.remember) await trustThisDevice(pending.uid);
  await clearPendingLogin();
  return { success: true as const };
}

export async function resendLoginCode(lang?: string) {
  const pending = await getPendingLogin();
  if (!pending) return { success: false as const, code: "otp_expired" };
  if (codeStillFresh(pending)) return { success: false as const, code: "rate_limited" };

  const { data } = await createAdminClient().auth.admin.getUserById(pending.uid);
  if (!data.user) return { success: false as const, code: "unknown" };
  const sent = await sendAuthEmail("login", data.user, () => newEmailCode(pending.email), lang);
  if (sent === "sent") await setPendingLogin(pending.uid, pending.email, pending.remember);
  return sent === "sent" ? { success: true as const } : { success: false as const, code: sent };
}
