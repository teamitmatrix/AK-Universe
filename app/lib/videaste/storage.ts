/*
 * External storage links (Espace Vidéaste handoff, pages 02 / 04): AK Universe does NOT host project files. A file or
 * a video version is a link to the project's existing storage. Only https links on these five providers' own domains
 * are accepted — checked here (server actions) and again by the database (is_storage_link, migration 013).
 * Shared by server and client code (no server-only imports).
 */

export const PROVIDERS = {
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  wetransfer: "WeTransfer",
  frameio: "Frame.io",
  onedrive: "OneDrive",
} as const;
export type Provider = keyof typeof PROVIDERS;

export const FILE_CATEGORIES = {
  rushs: "Rushs",
  musique: "Musique",
  logos: "Logos",
  images: "Images",
  documents: "Documents",
  exports: "Exports",
  versions_finales: "Versions finales",
} as const;
export type FileCategory = keyof typeof FILE_CATEGORIES;
export const isFileCategory = (v: unknown): v is FileCategory => typeof v === "string" && v in FILE_CATEGORIES;

const HOSTS: [Provider, RegExp][] = [
  ["google_drive", /(^|\.)(drive|docs)\.google\.com$/],
  ["dropbox", /(^|\.)(dropbox\.com|db\.tt)$/],
  ["wetransfer", /(^|\.)(wetransfer\.com|we\.tl)$/],
  ["frameio", /(^|\.)(frame\.io|f\.io)$/],
  ["onedrive", /(^|\.)(onedrive\.live\.com|1drv\.ms|sharepoint\.com|onedrive\.com)$/],
];

/** The provider of an https storage link, or null when the link is not accepted. */
export function providerOf(raw: string): Provider | null {
  const value = String(raw ?? "").trim();
  if (value.length > 2000 || /\s/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  return HOSTS.find(([, re]) => re.test(host))?.[0] ?? null;
}

/**
 * A publicly fetchable preview image for a storage link when the provider exposes one without hosting the file
 * ourselves (Google Drive thumbnails; Dropbox raw image links). Returns null when no preview can be derived —
 * the UI then shows a provider-branded cover instead of an empty play icon.
 */
export function thumbnailOf(raw: string, provider: Provider = providerOf(raw) ?? "google_drive"): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (provider === "google_drive") {
    const fromPath = url.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([^/]+)/)?.[1];
    const id = fromPath || url.searchParams.get("id");
    return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w640` : null;
  }
  if (provider === "dropbox") {
    // Only direct image paths can be shown as <img>; videos fall back to the branded cover.
    if (!/\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(url.pathname)) return null;
    const rawUrl = new URL(url.href);
    rawUrl.searchParams.set("raw", "1");
    rawUrl.searchParams.delete("dl");
    if (/dropbox\.com$/i.test(rawUrl.hostname)) rawUrl.hostname = "dl.dropboxusercontent.com";
    return rawUrl.toString();
  }
  return null;
}

/** Best-effort download URL for an external storage link (AK Universe never hosts the file). */
export function downloadUrlOf(raw: string, provider: Provider = providerOf(raw) ?? "google_drive"): string {
  const value = String(raw ?? "").trim();
  if (!value) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (provider === "google_drive") {
    const fromPath = url.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([^/]+)/)?.[1];
    const id = fromPath || url.searchParams.get("id");
    return id ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}` : value;
  }
  if (provider === "dropbox") {
    url.searchParams.set("dl", "1");
    url.searchParams.delete("raw");
    return url.toString();
  }
  if (provider === "onedrive") {
    // Shared OneDrive links often accept download=1.
    if (!url.searchParams.has("download")) url.searchParams.set("download", "1");
    return url.toString();
  }
  // Frame.io / WeTransfer: open the provider page (no stable public download rewrite).
  return value;
}
