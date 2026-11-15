/**
 * Only same-site paths are allowed after login. Rejects "//evil.com" and "/\evil.com"
 * (browsers read a backslash as a slash, which makes it an external URL).
 */
/**
 * Guests who try to pay from My Projects return here after sign-in or sign-up.
 * Replace this path when the post-auth landing page is chosen.
 */
export const PAYMENT_AUTH_RETURN = "/acompte";

/** Sign-in URL that continues to the payment step once the account exists. */
export function signInBeforePayment() {
  return `/connexion?redirectTo=${encodeURIComponent(PAYMENT_AUTH_RETURN)}`;
}

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
