import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { displayName, type StaffProfile } from "@/lib/admin/team";

/*
 * Access control of the Videographer space (Espace Vidéaste handoff, page 03) — same pattern as the Commercial space.
 * Every page, loader and server action of /videaste/* calls this itself (a layout check alone is not enough:
 * layouts do not re-run on client-side navigation).
 *   - the user comes from the verified Supabase session (getUser), never from the browser;
 *   - the role and the active flag are read from profiles on every request, so a deactivated videographer
 *     ("Inactif" in the admin) is refused at once, even with a still-valid session;
 *   - every query also runs with the videographer's own session, so RLS limits rows to their assigned projects
 *     (video_projects.videaste_id = auth.uid()) and their own tasks (tasks.assigned_to = auth.uid()).
 */

export type VideasteMe = { id: string; name: string; firstName: string; email: string; profile: StaffProfile };

/** The signed-in, active videographer — or null. Cached for the duration of one request. */
export const getVideaste = cache(async (): Promise<VideasteMe | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data || data.role !== "videaste" || data.active === false) return null;
  const profile = data as StaffProfile;
  const name = displayName(profile);
  return { id: user.id, name, firstName: profile.first_name || name.split(/[\s@]/)[0] || name, email: profile.email ?? user.email ?? "", profile };
});

/** For pages: logged out → sign-in; signed in with another role (or deactivated) → /espace, which routes or signs out. */
export async function requireVideaste(returnTo = "/videaste/dashboard") {
  const me = await getVideaste();
  if (me) return me;
  if (!(await getCurrentUser())) redirect(`/connexion?redirectTo=${encodeURIComponent(returnTo)}`);
  redirect("/espace");
}
