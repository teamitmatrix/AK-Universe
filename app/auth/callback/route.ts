import { NextResponse } from "next/server";
import { safeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = safeRedirect(requestUrl.searchParams.get("redirectTo"));

  if (!code) {
    return NextResponse.redirect(new URL("/connexion.html?error=oauth", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(new URL("/connexion.html?error=oauth", request.url));
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
