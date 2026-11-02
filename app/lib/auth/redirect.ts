/**
 * Only same-site paths are allowed after login. Rejects "//evil.com" and "/\evil.com"
 * (browsers read a backslash as a slash, which makes it an external URL).
 */
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
