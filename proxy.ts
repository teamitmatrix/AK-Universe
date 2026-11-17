import { NextResponse, type NextRequest } from "next/server";
import { redirectToPath } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

/** Pages that require a signed-in user. */
const PROTECTED_ROUTES = [
  "/compte",
  "/organisation",
  "/abonnement",
  "/paiement",
  "/acompte",
  "/admin",
  "/commercial",
  "/equipe",
  "/espace",
];

/** Signed-in users are sent away from these. */
const GUEST_ONLY_ROUTES = ["/connexion", "/inscription"];

function isServerAction(request: NextRequest) {
  return request.method === "POST" && Boolean(request.headers.get("next-action"));
}

export async function proxy(request: NextRequest) {
  // Server Actions POST to the current page and expect a pure RSC payload
  // (`text/x-component`). Refreshing Supabase cookies or redirecting here
  // corrupts that response → 502 Bad Gateway behind nginx / reverse proxies
  // and "An unexpected response was received from the server" in the browser.
  // Auth for actions is enforced inside each action / page instead.
  if (isServerAction(request)) {
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!user && isProtected) {
    const redirectTo = encodeURIComponent(`${pathname}${request.nextUrl.search}`);
    // Relative Location — do not use request.url / Host (Docker bind or VPS IP:port).
    return redirectToPath(`/connexion?redirectTo=${redirectTo}`, 307);
  }

  if (user && GUEST_ONLY_ROUTES.includes(pathname)) {
    // Keep main's guest redirect for clients; staff land via /espace after they open it.
    return redirectToPath("/", 307);
  }

  return response;
}

export const config = {
  matcher: [
    {
      // Skip Next internals, static files, OTP JSON API, sign-out (it ends the session itself), and Stripe webhooks.
      // Also skip Server Action POSTs (next-action) — they must not go through session cookie refresh.
      source: "/((?!_next/static|_next/image|assets/|api/auth/otp|auth/signout|api/stripe/webhook|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
