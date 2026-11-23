import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/*
 * Access control of the Client space (/dashboard/*) — same pattern as the Commercial and Videographer spaces.
 * Every page, loader and server action calls this itself (layouts do not re-run on client-side navigation):
 *   - the user comes from the verified Supabase session (getUser), never from the browser;
 *   - staff accounts (admin / commercial / vidéaste) and deactivated accounts are refused;
 *   - a customer who enabled two-factor authentication (authenticator app, Supabase MFA) must have passed it in
 *     this session (assurance level aal2) — otherwise everything is refused and pages send them to the code step;
 *   - every query then runs with the client's own session, so RLS only returns their own rows.
 */

export type ClientMe = { id: string; name: string; firstName: string; email: string };

const STAFF_ROLES = ["admin", "commercial", "videaste"];

/** True when this session still has to enter its authenticator code (2FA enabled, not passed yet). */
export const mfaPending = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
});

/** The signed-in, active customer — or null. Cached for the duration of one request. */
export const getClientMe = cache(async (): Promise<ClientMe | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  if (await mfaPending()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = data as { role?: string; active?: boolean | null; first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  if (profile?.active === false || STAFF_ROLES.includes(profile?.role ?? "")) return null;

  const meta = user.user_metadata ?? {};
  const firstName = (profile?.first_name || meta.first_name || String(meta.full_name ?? "").split(" ")[0] || "").trim();
  const lastName = (profile?.last_name || meta.last_name || "").trim();
  // The verified auth e-mail is the account address (profiles.email mirrors it).
  const email = user.email || profile?.email || "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  return { id: user.id, name, firstName: firstName || name.split(/[\s@]/)[0] || name, email };
});

/** For pages: logged out → sign-in; 2FA not passed → code step; staff or deactivated → /espace (routes or signs out). */
export async function requireClient(returnTo = "/dashboard") {
  const me = await getClientMe();
  if (me) return me;
  if (!(await getCurrentUser())) redirect(`/connexion?redirectTo=${encodeURIComponent(returnTo)}`);
  if (await mfaPending()) redirect(`/dashboard/verification?redirectTo=${encodeURIComponent(returnTo)}`);
  redirect("/espace");
}
