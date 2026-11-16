import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE, toAdminLang, type TextLang } from "@/config/languages";

/**
 * Admin (and /equipe) language for server components.
 * Reads the same `aku-language` choice as LangSwitch (cookie mirror of localStorage).
 */
export const getAdminLang = cache(async (): Promise<TextLang> => {
  const jar = await cookies();
  // `aku-language` is the LangSwitch key; `aku-lang` may remain from an older cookie.
  const value = jar.get(LANG_COOKIE)?.value ?? jar.get("aku-lang")?.value;
  return toAdminLang(value);
});

/** Alias used by /equipe while the public i18n catalogues live on another branch. */
export const getLang = getAdminLang;
