"use server";

import { emailConfigured } from "@/lib/email";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { sendAuthEmail } from "./emails";
import { resendSignupOtp, verifySignupOtp } from "./otp-service";
import { setPendingLogin } from "./two-factor";
import { isStrongPassword } from "./password";
import { safeRedirect } from "./redirect";

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  lang?: string;
  /** Same-site path to open once the account exists. Defaults to organisation setup. */
  redirectTo?: string;
};

export async function signUp(input: SignupInput) {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!firstName || !lastName || !email || !isStrongPassword(input.password)) {
    return { success: false as const, code: "invalid_input" };
  }

  // Without Resend, Supabase sends its own confirmation e-mail.
  if (!emailConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?redirectTo=${encodeURIComponent(safeRedirect(input.redirectTo, "/organisation"))}`,
      },
    });
    if (error) return { success: false as const, code: error.code ?? "unknown" };
    // A session is returned directly when e-mail confirmation is disabled in Supabase.
    return { success: true as const, needsVerification: !data.session };
  }

  // Creates the (unconfirmed) user and returns its 6-digit code without sending anything; Resend delivers it.
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "signup",
    email,
    password: input.password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });
  if (error || !data.user || !data.properties?.email_otp) {
    return { success: false as const, code: error?.code ?? "unknown" };
  }

  const sent = await sendAuthEmail("signup", data.user, data.properties.email_otp, input.lang);
  if (sent === "failed") return { success: false as const, code: "email_failed" };
  // rate_limited on a brand-new sign-up is unexpected; still keep the pending cookie so verify can proceed
  // if an earlier code for this address is still live.
  await setPendingLogin(data.user.id, email, false);
  return { success: true as const, needsVerification: true };
}

/** Kept for compatibility; /verification uses POST /api/auth/otp instead (avoids nginx 502). */
export async function verifySignupCode(email: string, token: string) {
  try {
    return await verifySignupOtp(email, token);
  } catch (cause) {
    console.error("verifySignupCode failed", cause);
    return { success: false as const, code: "unknown" };
  }
}

export async function resendSignupCode(email: string, lang?: string, redirectTo?: string) {
  if (!emailConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?redirectTo=${encodeURIComponent(safeRedirect(redirectTo, "/organisation"))}`,
      },
    });
    return error ? { success: false as const, code: error.code ?? "unknown" } : { success: true as const };
  }

  try {
    return await resendSignupOtp(lang);
  } catch (cause) {
    console.error("resendSignupCode failed", cause);
    return { success: false as const, code: "unknown" };
  }
}
