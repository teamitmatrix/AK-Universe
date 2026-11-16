"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useTransition, type ReactNode } from "react";
import { FIXED_TRANSLATIONS, isLang, isSiteLang, LANG_COOKIE, SOURCE_LANG, toAdminLang, type Lang, type SiteLang } from "@/config/languages";
import { createT, type Catalog, type T } from "./translate";

type I18nValue = { t: T; siteLang: SiteLang; change: (lang: SiteLang) => void; pending: boolean };

const I18nContext = createContext<I18nValue | null>(null);

/** True when the page in this language comes from Google Translate. */
export const needsGoogle = (lang: SiteLang) => lang !== SOURCE_LANG && !(FIXED_TRANSLATIONS && isLang(lang));

/** Cookie read by Google Translate: "/fr/de" translates the page from French to German. */
export function setTranslateCookie(lang: SiteLang) {
  const host = location.hostname;
  const domains = ["", `; domain=${host}`, `; domain=.${host.split(".").slice(-2).join(".")}`];
  for (const domain of domains) document.cookie = `googtrans=; path=/; max-age=0${domain}`;
  // Languages with a fixed catalogue are rendered by the server, not machine-translated.
  if (needsGoogle(lang)) document.cookie = `googtrans=/${SOURCE_LANG}/${lang}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Root provider (app/layout.tsx). `lang` is the language the texts are rendered in (French while fixed
 * translations are off), `siteLang` the visitor's choice in the switch (Google Translate target).
 */
export function I18nProvider({
  lang,
  siteLang,
  catalog,
  children,
}: {
  lang: Lang;
  siteLang: SiteLang;
  catalog: Catalog;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const value = useMemo<I18nValue>(
    () => ({
      t: createT(lang, catalog),
      siteLang,
      pending,
      change(next) {
        if (next === siteLang) return;
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setTranslateCookie(next);
        if (FIXED_TRANSLATIONS) {
          // Server components re-render in the new language; client state (cart, forms) is kept.
          startTransition(() => router.refresh());
          return;
        }
        // Once Google Translate has rewritten the page, only a reload restores or re-translates it cleanly.
        location.reload();
      },
    }),
    [lang, siteLang, catalog, pending, router],
  );

  // Visitors who picked a language before the cookie existed (localStorage "aku-language"): keep their choice.
  useEffect(() => {
    if (document.cookie.includes(`${LANG_COOKIE}=`)) return;
    try {
      const legacy = localStorage.getItem("aku-language");
      localStorage.removeItem("aku-language");
      if (isSiteLang(legacy) && legacy !== SOURCE_LANG) value.change(legacy);
    } catch {}
  }, [value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT / useLang must be used inside I18nProvider");
  return value;
}

/** Translator for client components. */
export const useT = () => useI18n().t;

/** Language the texts are rendered in (French while fixed translations are off). Admin screens use their own copy. */
export function useLang() {
  const { t, siteLang, change } = useI18n();
  const pathname = usePathname();
  const lang: Lang = pathname?.startsWith("/admin") ? toAdminLang(siteLang) : t.lang;
  return [lang, change] as const;
}

/** Language chosen in the switch, and a function to change it. */
export function useSiteLang() {
  const { siteLang, change } = useI18n();
  return [siteLang, change] as const;
}
