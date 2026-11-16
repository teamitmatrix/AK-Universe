"use server";

import { emailConfigured } from "@/lib/email";
import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { newEmailCode, sendAuthEmail } from "./emails";
import { resendLoginOtp, verifyLoginOtp } from "./otp-service";
import {
  codeStillFresh,
  getPendingLogin,
  isTrustedDevice,
  setPendingLogin,
} from "./two-factor";

/**
 * Step 1 — password. With e-mail configured (Resend), a correct password does not sign in yet:
 * a 6-digit code is e-mailed (two-factor), unless this browser was trusted with "Se souvenir de moi".
 */
export async function login(email: string, password: string, remember = false, lang?: string) {
  try {
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
    // rate_limited: no new code was generated, so only an earlier OTP still pending in this browser can be entered.
    if (sent === "rate_limited" && existing?.uid !== user.id) return { success: false as const, code: "rate_limited" };
    if (sent === "sent") await setPendingLogin(user.id, user.email!, remember);
    else await setPendingLogin(user.id, user.email!, remember, existing?.issuedAt);
    return { success: true as const, step: "code" as const, email: user.email! };
  } catch (cause) {
    console.error("login failed", cause);
    return { success: false as const, code: "unknown" };
  }
}

/** Kept for compatibility; /verification uses POST /api/auth/otp instead (avoids nginx 502). */
export async function verifyLoginCode(code: string) {
  try {
    return await verifyLoginOtp(code);
  } catch (cause) {
    console.error("verifyLoginCode failed", cause);
    return { success: false as const, code: "unknown" };
  }
}

export async function resendLoginCode(lang?: string) {
  try {
    return await resendLoginOtp(lang);
  } catch (cause) {
    console.error("resendLoginCode failed", cause);
    return { success: false as const, code: "unknown" };
  }
}
