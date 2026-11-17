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

/**
 * Public origin for redirects behind Docker/nginx.
 * `request.url` is often `http://0.0.0.0:3000/...` in the container — using that as the
 * redirect base sends browsers to a dead host (502 Bad Gateway).
 */
export function publicOrigin(request: Request): string {
  const site = getSiteUrl();
  // Production: trust the configured public URL first (avoids container bind addresses).
  if (site && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(site)) return site;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim() || "";
  const badHost = !host || host.startsWith("0.0.0.0") || host.startsWith("[::]");
  if (!badHost) {
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
