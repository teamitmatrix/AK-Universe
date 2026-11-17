import { homePathFor } from "@/lib/auth/account";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectToPath } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * "Mon espace": sends a signed-in user to the space of their role (handoff "Roles and redirect targets"):
 *   client → /dashboard · entreprise → /entreprise/dashboard · commercial → /commercial/dashboard
 *   admin → /admin/dashboard · vidéaste → /videaste/dashboard · logged out → /connexion
 * The role is read on the server from profiles, never from the browser. A deactivated account is signed out.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return redirectToPath("/connexion", 307);

  const home = await homePathFor(user.id);
  if (!home) {
    await (await createClient()).auth.signOut();
    return redirectToPath("/connexion?error=disabled", 307);
  }
  return redirectToPath(home, 307);
}
