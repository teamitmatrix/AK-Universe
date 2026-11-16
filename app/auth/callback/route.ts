import { NextResponse } from "next/server";
import { landingPathFor } from "@/lib/auth/account";
import { safeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requested = requestUrl.searchParams.get("redirectTo");

  if (!code) {
    return NextResponse.redirect(new URL("/connexion?error=oauth", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(new URL("/connexion?error=oauth", request.url));
  }

  const redirectTo = safeRedirect(requested, await landingPathFor(data.user.id));
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
