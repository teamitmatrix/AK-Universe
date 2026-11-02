"use server";

import { emailConfigured } from "@/lib/email";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { newEmailCode, sendAuthEmail } from "./emails";
import { clearPendingLogin, getPendingLogin, setPendingLogin } from "./two-factor";
import { isStrongPassword } from "./password";

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  lang?: string;
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
        emailRedirectTo: `${getSiteUrl()}/auth/callback?redirectTo=/organisation`,
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
  await setPendingLogin(data.user.id, email, false);
  return { success: true as const, needsVerification: true };
}

export async function verifySignupCode(email: string, token: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email",
  });
  if (error) return { success: false as const, code: error.code ?? "unknown" };
  await clearPendingLogin();
  return { success: true as const };
}

export async function resendSignupCode(email: string, lang?: string) {
  if (!emailConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${getSiteUrl()}/auth/callback?redirectTo=/organisation` },
    });
    return error ? { success: false as const, code: error.code ?? "unknown" } : { success: true as const };
  }

  // Only the browser that just signed up may ask for a new code (no e-mail bombing of other addresses).
  const pending = await getPendingLogin();
  if (!pending) return { success: false as const, code: "otp_expired" };
  const { data } = await createAdminClient().auth.admin.getUserById(pending.uid);
  if (!data.user) return { success: false as const, code: "unknown" };
  const sent = await sendAuthEmail("signup", data.user, () => newEmailCode(pending.email), lang);
  return sent === "sent" ? { success: true as const } : { success: false as const, code: sent };
}
