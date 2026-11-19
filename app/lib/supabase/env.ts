import { NextResponse } from "next/server";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return { url, key };
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

const LOOPBACK_OR_BIND =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::\]|\[::1\])(?::\d+)?$/i;
const BARE_IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/;

function hostIsUsable(host: string) {
  if (!host) return false;
  if (LOOPBACK_OR_BIND.test(host) || BARE_IPV4.test(host)) return false;
  return true;
}

/**
 * Public origin when an absolute URL is required (e-mails, OAuth redirectTo, etc.).
 * Prefer relative redirects via `redirectToPath` for browser navigations behind Docker/nginx —
 * `request.url` / `Host` are often `0.0.0.0:3000` or the server IP:port.
 */
export function publicOrigin(request: Request): string {
  const site = getSiteUrl();
  try {
    const siteHost = new URL(site).host;
    if (hostIsUsable(siteHost)) return site;
  } catch {
    /* fall through */
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim() || "";
  if (hostIsUsable(host)) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      forwardedProto === "http" || forwardedProto === "https"
        ? forwardedProto
        : host.includes("localhost") || host.startsWith("127.")
          ? "http"
          : "https";
    return `${proto}://${host}`;
  }
  return site;
}

/**
 * Browser redirect for proxy / route handlers. Uses an absolute URL based on getSiteUrl()
 * (NEXT_PUBLIC_SITE_URL, or http://localhost:3000) so Next.js never receives a relative Location
 * (which throws Invalid URL in the proxy). Set NEXT_PUBLIC_SITE_URL to the public origin in Docker/VPS
 * so redirects never leak 0.0.0.0 / the bind address from request.url.
 */
export function redirectToPath(path: string, status: 303 | 302 | 307 = 303) {
  const location = path.startsWith("/") ? path : `/${path}`;
  return NextResponse.redirect(new URL(location, getSiteUrl()), status);
}
