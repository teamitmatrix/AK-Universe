import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { displayName, type StaffProfile } from "@/lib/admin/team";

/*
 * Access control of the Commercial space (handoff page 03). Every page, loader and server action of
 * /commercial/* calls this itself — a layout check alone is not enough (layouts do not re-run on navigation).
 *   - the user comes from the verified Supabase session (getUser), never from the browser;
 *   - the role and the active flag are read from profiles on every request, so a deactivated rep is
 *     refused at once, even with a still-valid session;
 *   - every query below also runs with the rep's own session, so RLS limits rows to theirs in the database.
 */

export type CommercialMe = { id: string; name: string; email: string; profile: StaffProfile };

/** The signed-in, active sales rep — or null. Cached for the duration of one request. */
export const getCommercial = cache(async (): Promise<CommercialMe | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data || data.role !== "commercial" || data.active === false) return null;
  const profile = data as StaffProfile;
  return { id: user.id, name: displayName(profile), email: profile.email ?? user.email ?? "", profile };
});

/** For pages: logged out → sign-in; signed in with another role (or deactivated) → /espace, which routes or signs out. */
export async function requireCommercial(returnTo = "/commercial/dashboard") {
  const me = await getCommercial();
  if (me) return me;
  if (!(await getCurrentUser())) redirect(`/connexion?redirectTo=${encodeURIComponent(returnTo)}`);
  redirect("/espace");
}
