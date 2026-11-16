import "server-only";
import type { TextLang } from "@/config/languages";

/**
 * Admin (and /equipe) language for server components.
 * Main keeps the public site on Google Translate; Admin ships its own French/English copy.
 * Client components read the switch via LangSwitch; the first paint stays French.
 */
export async function getAdminLang(): Promise<TextLang> {
  return "fr";
}

/** Alias used by /equipe while the public i18n catalogues live on another branch. */
export const getLang = getAdminLang;
