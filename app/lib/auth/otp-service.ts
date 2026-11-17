import "server-only";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { newEmailCode, newSignupCode, sendAuthEmail } from "./emails";
import {
  clearPendingLogin,
  codeStillFresh,
  getPendingLogin,
  setPendingLogin,
  trustThisDevice,
} from "./two-factor";

export type OtpResult =
  | { success: true }
  | { success: false; code: string };

/** Shared OTP verify/resend used by Server Actions and /api/auth/otp (JSON, nginx-safe). */
export async function verifyLoginOtp(code: string): Promise<OtpResult> {
  const pending = await getPendingLogin();
  if (!pending) return { success: false, code: "otp_expired" };

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
    return { success: false, code: "otp_invalid" };
  }

  if (pending.remember) await trustThisDevice(pending.uid);
  await clearPendingLogin();
  return { success: true };
}

export async function verifySignupOtp(email: string, token: string): Promise<OtpResult> {
  const pending = await getPendingLogin();
  if (!pending) return { success: false, code: "otp_expired" };

  const address = email.trim().toLowerCase();
  if (pending.email !== address) return { success: false, code: "otp_invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: address,
    token: token.trim(),
    type: "email",
  });
  if (error || data.user?.id !== pending.uid) {
    if (!error) await supabase.auth.signOut();
    return { success: false, code: "otp_invalid" };
  }
  await clearPendingLogin();
  return { success: true };
}

export async function resendLoginOtp(lang?: string): Promise<OtpResult> {
  const pending = await getPendingLogin();
  if (!pending) return { success: false, code: "otp_expired" };
  if (codeStillFresh(pending)) return { success: false, code: "rate_limited" };

  const { data } = await createAdminClient().auth.admin.getUserById(pending.uid);
  if (!data.user) return { success: false, code: "unknown" };
  const sent = await sendAuthEmail("login", data.user, () => newEmailCode(pending.email), lang);
  if (sent === "sent") await setPendingLogin(pending.uid, pending.email, pending.remember);
  return sent === "sent" ? { success: true } : { success: false, code: sent };
}

export async function resendSignupOtp(lang?: string): Promise<OtpResult> {
  const pending = await getPendingLogin();
  if (!pending) return { success: false, code: "otp_expired" };
  if (codeStillFresh(pending)) return { success: false, code: "rate_limited" };

  const { data } = await createAdminClient().auth.admin.getUserById(pending.uid);
  if (!data.user) return { success: false, code: "unknown" };

  const sent = await sendAuthEmail("signup", data.user, () => newSignupCode(pending.email), lang);
  if (sent === "sent") await setPendingLogin(pending.uid, pending.email, false);
  return sent === "sent" ? { success: true } : { success: false, code: sent };
}

/**
 * After a successful browser-side OTP verify: clear aku-2fa and optionally set aku-trusted.
 * `remember` from the client covers the case where the pending cookie already expired but the OTP was still valid.
 */
export async function finalizeOtp(userId: string, remember?: boolean): Promise<OtpResult> {
  const pending = await getPendingLogin();
  if (pending && pending.uid !== userId) return { success: false, code: "otp_invalid" };
  const shouldTrust = Boolean(remember ?? pending?.remember);
  if (shouldTrust) await trustThisDevice(userId);
  await clearPendingLogin();
  return { success: true };
}
