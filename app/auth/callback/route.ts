import { NextResponse } from "next/server";
import { isDeactivated } from "@/lib/auth/account";
import { safeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/** Google / Apple / Microsoft sign-in (and the Supabase e-mail links) land here. Default next stop: /espace (role redirect). */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = safeRedirect(requestUrl.searchParams.get("redirectTo"), "/espace");

  if (!code) {
    return NextResponse.redirect(new URL("/connexion?error=oauth", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(new URL("/connexion?error=oauth", request.url));
  }

  // Same rule as the code sign-in: a deactivated account does not get a session.
  if (data.user && (await isDeactivated(data.user.id))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/connexion?error=disabled", request.url));
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
