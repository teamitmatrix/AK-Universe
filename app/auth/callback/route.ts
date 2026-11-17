import { landingPathFor } from "@/lib/auth/account";
import { safeRedirect } from "@/lib/auth/redirect";
import { redirectToPath } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requested = requestUrl.searchParams.get("redirectTo");

  if (!code) {
    return redirectToPath("/connexion?error=oauth", 307);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      console.error("OAuth callback error:", error?.message ?? "no user");
      return redirectToPath("/connexion?error=oauth", 307);
    }

    // Staff always land in their space (ignore a stale redirectTo like /admin from a prior visit).
    const home = await landingPathFor(data.user.id);
    const staffHome =
      home.startsWith("/admin") ||
      home.startsWith("/commercial") ||
      home.startsWith("/equipe") ||
      home.startsWith("/videaste");
    const next = staffHome ? home : safeRedirect(requested, home);
    return redirectToPath(next, 303);
  } catch (cause) {
    console.error("OAuth callback failed:", cause);
    return redirectToPath("/connexion?error=oauth", 307);
  }
}
