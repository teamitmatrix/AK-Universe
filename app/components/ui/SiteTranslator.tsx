"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { LANGUAGES, SOURCE_LANG } from "@/config/languages";
import { LangSwitch, setTranslateCookie, useLang } from "./LangSwitch";

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
/** Back-office stays in French. */
const NO_SWITCH = ["/admin"];

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate?: { TranslateElement: new (options: object, id: string) => unknown } };
  }
}

/**
 * Google Translate rewrites text nodes, which React does not expect. Without this guard React throws
 * "removeChild / insertBefore: node is not a child" on the next update (facebook/react#11538).
 */
function guardDomForTranslation() {
  const proto = Node.prototype as Node & { __akGuarded?: boolean };
  if (proto.__akGuarded) return;
  proto.__akGuarded = true;
  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };
  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return insertBefore.call(this, node, null) as T;
    return insertBefore.call(this, node, ref) as T;
  };
}

/** The brand name must never be translated ("AK Universe" became "AK-Universum"). */
const BRAND = ".logo";

/** Static pages build their header in JavaScript, so new logos are marked as they appear. */
function protectBrand() {
  const mark = (root: ParentNode) => root.querySelectorAll(BRAND).forEach((el) => el.classList.add("notranslate"));
  mark(document);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(BRAND)) node.classList.add("notranslate");
        else mark(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}

let loading = false;

function loadGoogleTranslate() {
  if (loading) return;
  loading = true;
  guardDomForTranslation();
  protectBrand();
  window.googleTranslateElementInit = () => {
    new window.google!.translate!.TranslateElement(
      {
        pageLanguage: SOURCE_LANG,
        includedLanguages: LANGUAGES.map((l) => l.code).join(","),
        autoDisplay: false,
      },
      "google_translate_element"
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
 * Site-wide translation: French is the original, the visitor picks any of the 24 EU languages.
 * Google Translate is only loaded once a visitor chooses another language.
 */
export function SiteTranslator() {
  const [lang, setLang] = useLang();
  const pathname = usePathname();

  useEffect(() => {
    if (lang === SOURCE_LANG) return;
    setTranslateCookie(lang);
    loadGoogleTranslate();
  }, [lang]);

  const floating = !INLINE_SWITCH.includes(pathname) && !NO_SWITCH.includes(pathname);

  return (
    <>
      <div id="google_translate_element" hidden />
      {floating && (
        <div className="lang-float">
          <LangSwitch lang={lang} onChange={setLang} up compact />
        </div>
      )}
    </>
  );
}
