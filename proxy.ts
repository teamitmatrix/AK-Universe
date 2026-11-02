import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Pages that require a signed-in user. */
const PROTECTED_ROUTES = [
  "/compte",
  "/organisation",
  "/abonnement",
  "/paiement",
  "/admin",
];

/** Signed-in users are sent away from these. */
const GUEST_ONLY_ROUTES = ["/connexion", "/inscription"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && PROTECTED_ROUTES.includes(pathname)) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals, static files and API webhooks.
    "/((?!_next/static|_next/image|assets/|api/stripe/webhook|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
