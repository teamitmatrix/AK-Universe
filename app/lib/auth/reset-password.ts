"use server";

import { emailConfigured } from "@/lib/email";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { sendAuthEmail } from "./emails";

export async function sendResetEmail(email: string, lang?: string) {
  const address = email.trim().toLowerCase();

  if (!emailConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${getSiteUrl()}/auth/reset-password`,
    });
    return error ? { success: false as const, code: error.code ?? "unknown" } : { success: true as const };
  }

  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email: address });
  // Same answer whether the account exists or not, so the form cannot be used to find accounts.
  if (error || !data.user || !data.properties?.hashed_token) return { success: true as const };

  // The reset page checks the token in the browser: mail scanners that open links do not run scripts, so they cannot use it up.
  const link = `${getSiteUrl()}/auth/reset-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  const sent = await sendAuthEmail("reset", data.user, link, lang);
  return sent === "failed" ? { success: false as const, code: "email_failed" } : { success: true as const };
}

/** Security notice after a password change (reset-password page). */
export async function notifyPasswordChanged(lang?: string) {
  if (!emailConfigured()) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) await sendAuthEmail("password_changed", data.user, "", lang);
}
