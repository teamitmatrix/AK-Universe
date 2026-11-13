import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { FIXED_TRANSLATIONS, isLang, isSiteLang, LANG_COOKIE, SOURCE_LANG, type Lang, type SiteLang } from "@/config/languages";
import { CLIENT_CATALOGS, SERVER_CATALOGS } from "./catalogs";
import { createT } from "./translate";

/** Language chosen in the switch (cookie), French by default. */
export const getSiteLang = cache(async (): Promise<SiteLang> => {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isSiteLang(value) ? value : SOURCE_LANG;
});

/**
 * Language the texts are rendered in. French while fixed translations are switched off
 * (config/languages.ts): Google Translate then translates the French page in the browser.
 */
export const getLang = cache(async (): Promise<Lang> => {
  if (!FIXED_TRANSLATIONS) return SOURCE_LANG;
  const value = await getSiteLang();
  return isLang(value) ? value : SOURCE_LANG;
});

/** Translator for server components, metadata, server actions and route handlers. */
export const getT = cache(async () => {
  const lang = await getLang();
  return createT(lang, SERVER_CATALOGS[lang]);
});

/** Translator for a given language (e-mails, background jobs). */
export const tFor = (lang: Lang) => createT(lang, SERVER_CATALOGS[lang]);

/** Only the texts of client components travel to the browser, and only for the current language. */
export const clientCatalog = (lang: Lang) => CLIENT_CATALOGS[lang];
