import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Drops a session Auth no longer accepts, then sends the visitor to sign in. */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const requested = new URL(request.url).searchParams.get("redirectTo") ?? "/admin/dashboard";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/admin/dashboard";
  const url = new URL("/connexion", request.url);
  url.searchParams.set("redirectTo", next);
  return NextResponse.redirect(url);
}
