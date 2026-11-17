import { NextResponse } from "next/server";
import { landingPathFor } from "@/lib/auth/account";
import { safeRedirect } from "@/lib/auth/redirect";
import { publicOrigin } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, publicOrigin(request)));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requested = requestUrl.searchParams.get("redirectTo");

  if (!code) {
    return redirectTo(request, "/connexion?error=oauth");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      console.error("OAuth callback error:", error?.message ?? "no user");
      return redirectTo(request, "/connexion?error=oauth");
    }

    // Staff always land in their space (ignore a stale redirectTo like /admin from a prior visit).
    const home = await landingPathFor(data.user.id);
    const staffHome =
      home.startsWith("/admin") || home.startsWith("/commercial") || home.startsWith("/equipe") || home.startsWith("/videaste");
    const next = staffHome ? home : safeRedirect(requested, home);
    return redirectTo(request, next);
  } catch (cause) {
    console.error("OAuth callback failed:", cause);
    return redirectTo(request, "/connexion?error=oauth");
  }
}
