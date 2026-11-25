/**
 * Guests who try to pay from My Projects return here after sign-in or sign-up.
 * Replace this path when the post-auth landing page is chosen.
 */
export const PAYMENT_AUTH_RETURN = "/acompte";

/** Sign-in URL that continues to the payment step once the account exists. */
export function signInBeforePayment() {
  return `/connexion?redirectTo=${encodeURIComponent(PAYMENT_AUTH_RETURN)}`;
}

/**
 * Where to finish a subscription the visitor started on the public site.
 * Any other path is ignored so registration cannot be sent off-site.
 * /paiement is kept as-is (it carries the chosen plan). The retired /abonnement page
 * continues onto that checkout when a plan is present, otherwise the public price list.
 */
export function subscriptionResumePath(value: string | null | undefined): string | null {
  const path = safeRedirect(value, "");
  if (!path || path === "/") return null;
  const hashAt = path.indexOf("#");
  const beforeHash = hashAt === -1 ? path : path.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const pathname = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const search = queryAt === -1 ? "" : beforeHash.slice(queryAt);
  if (pathname === "/paiement" || pathname.startsWith("/paiement/")) return path;
  if (pathname === "/abonnement" || pathname.startsWith("/abonnement/")) {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const plan = params.get("plan");
    if (!plan) return "/agents-ia#tarifs";
    const next = new URLSearchParams();
    next.set("plan", plan);
    const cycle = params.get("cycle");
    if (cycle) next.set("cycle", cycle);
    return `/paiement?${next}`;
  }
  return null;
}

/** Same-site path only. Rejects "//evil.com" and "/\evil.com" (browsers treat a backslash as a slash). */
export function safeRedirect(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.includes("\\")) return fallback;
  try {
    const base = "http://localhost";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    let pathname = url.pathname;
    if (pathname.endsWith(".html")) pathname = pathname.slice(0, -".html".length) || "/";
    if (pathname === "/index") pathname = "/";
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
