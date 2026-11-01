/**
 * Only same-site paths are allowed after login. Rejects "//evil.com" and "/\evil.com"
 * (browsers read a backslash as a slash, which makes it an external URL).
 */
export function safeRedirect(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.includes("\\")) return fallback;
  try {
    const base = "http://localhost";
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
