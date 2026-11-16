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
