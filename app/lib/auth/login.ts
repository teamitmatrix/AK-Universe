"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { newEmailCode, sendAuthEmail } from "./emails";
import { clearPendingLogin, getPendingLogin, trustThisDevice } from "./two-factor";

/**
 * Password sign-in. The e-mail code step is paused on this branch; restore it from main
 * when sign-in should ask for the code again. `remember` and `lang` stay in the signature for that.
 */
export async function login(email: string, password: string, _remember = false, _lang?: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { success: false as const, code: error.code ?? "unknown" } : { success: true as const, step: "done" as const };
}

/** Step 2 — the e-mailed code. Only works after step 1 in the same browser. */
export async function verifyLoginCode(code: string) {
  const pending = await getPendingLogin();
  if (!pending) return { success: false as const, code: "otp_expired" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: pending.email, token: code.trim(), type: "email" });
  if (error || data.user?.id !== pending.uid) {
    if (!error) await supabase.auth.signOut();
    return { success: false as const, code: error?.code ?? "unknown" };
  }

  if (pending.remember) await trustThisDevice(pending.uid);
  await clearPendingLogin();
  return { success: true as const };
}

export async function resendLoginCode(lang?: string) {
  const pending = await getPendingLogin();
  if (!pending) return { success: false as const, code: "otp_expired" };
  const { data } = await createAdminClient().auth.admin.getUserById(pending.uid);
  if (!data.user) return { success: false as const, code: "unknown" };
  const sent = await sendAuthEmail("login", data.user, () => newEmailCode(pending.email), lang);
  return sent === "sent" ? { success: true as const } : { success: false as const, code: sent };
}
