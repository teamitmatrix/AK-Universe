"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SITE_LANGUAGES, SOURCE_LANG } from "@/config/languages";
import { needsGoogle, setTranslateCookie, useSiteLang } from "@/i18n/client";
import { LangSwitch } from "./LangSwitch";

/** Pages that already show the language switch in their own layout. */
const INLINE_SWITCH = [
  "/connexion",
  "/inscription",
  "/verification",
  "/organisation",
  "/abonnement",
  "/paiement",
  "/auth/reset-password",
];

/**
 * Spaces whose header already holds the switch: admin (AdmShell), sales (CommercialFrame), team (/equipe).
 * The printable quote / invoice (/commercial/document) has no header, so it keeps the floating switch.
 */
const HEADER_SWITCH = ["/admin", "/commercial", "/equipe"];
const hasHeaderSwitch = (path: string) =>
  path !== "/commercial/document" && HEADER_SWITCH.some((p) => path === p || path.startsWith(`${p}/`));

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate?: { TranslateElement: new (options: object, id: string) => unknown } };
  }
}

/*
 * The brand name must never be translated ("AK Universe" became "AK-Universum"): every `.logo` link is rendered
 * with class="notranslate" translate="no" in its own component (SiteHeader, VideoHeader, AuthShell, LoginScreen).
 * It is NOT added here by script: changing React-rendered markup from outside caused hydration errors on pages
 * whose content hydrates later (e.g. /connexion, inside <Suspense>).
 */

let loading = false;

function loadGoogleTranslate() {
  if (loading) return;
  loading = true;
  window.googleTranslateElementInit = () => {
    new window.google!.translate!.TranslateElement(
      {
        pageLanguage: SOURCE_LANG,
        includedLanguages: SITE_LANGUAGES.map((l) => l.code).join(","),
        autoDisplay: false,
      },
      "google_translate_element",
    );
  };
  const script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  script.onerror = () => {
    loading = false;
  };
  document.body.appendChild(script);
}

/**
 * Site-wide translation: French is the original, the visitor picks a language from the switch
 * (EU languages plus Hindi and Urdu). Google Translate is only loaded once another language is chosen.
 * The DOM guard it needs with React is the inline script in app/layout.tsx.
 */
export function SiteTranslator() {
  const [lang] = useSiteLang();
  const pathname = usePathname();

  useEffect(() => {
    if (!needsGoogle(lang)) return;
    setTranslateCookie(lang);
    loadGoogleTranslate();
  }, [lang]);

  const floating = !INLINE_SWITCH.includes(pathname) && !hasHeaderSwitch(pathname);

  return (
    <>
      <div id="google_translate_element" hidden />
      {floating && (
        <div className="lang-float">
          <LangSwitch up compact />
        </div>
      )}
    </>
  );
}
