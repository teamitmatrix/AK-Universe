"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LANGUAGES, SOURCE_LANG, isLang, type FlagSpec, type Lang, type TextLang } from "@/config/languages";
import { Icon } from "./Icon";

export type { Lang, TextLang };

const STORAGE_KEY = "aku-language";
/** Values written by the static site before the 24 languages existed. */
const LEGACY_LABELS: Record<string, Lang> = { Français: "fr", English: "en" };

function Flag({ spec }: { spec: FlagSpec }) {
  let body;
  if ("stripes" in spec) {
    const weights = spec.weights ?? spec.colors.map(() => 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let offset = 0;
    body = spec.colors.map((color, i) => {
      const size = (weights[i] / total) * (spec.stripes === "v" ? 30 : 20);
      const rect =
        spec.stripes === "v" ? (
          <rect key={i} x={offset} y={0} width={size + 0.1} height={20} fill={color} />
        ) : (
          <rect key={i} x={0} y={offset} width={30} height={size + 0.1} fill={color} />
        );
      offset += size;
      return rect;
    });
  } else if ("cross" in spec) {
    body = (
      <>
        <rect width={30} height={20} fill={spec.bg} />
        <rect x={9} width={4} height={20} fill={spec.cross} />
        <rect y={8} width={30} height={4} fill={spec.cross} />
      </>
    );
  } else if (spec.special === "uk") {
    body = (
      <>
        <rect width={30} height={20} fill="#012169" />
        <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth={4} />
        <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth={1.5} />
        <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth={6} />
        <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth={3.5} />
      </>
    );
  } else if (spec.special === "cz") {
    body = (
      <>
        <rect width={30} height={10} fill="#fff" />
        <rect y={10} width={30} height={10} fill="#d7141a" />
        <path d="M0 0l15 10L0 20z" fill="#11457e" />
      </>
    );
  } else {
    body = (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} y={(i * 20) / 9} width={30} height={20 / 9 + 0.1} fill={i % 2 ? "#fff" : "#0d5eaf"} />
        ))}
        <rect width={11.1} height={11.1} fill="#0d5eaf" />
        <rect x={4.44} width={2.22} height={11.1} fill="#fff" />
        <rect y={4.44} width={11.1} height={2.22} fill="#fff" />
      </>
    );
  }
  return (
    <span className="flag" aria-hidden="true">
      <svg viewBox="0 0 30 20" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        {body}
      </svg>
    </span>
  );
}

// One store for the whole page, so every component switches together.
const listeners = new Set<() => void>();
let fallback: Lang = SOURCE_LANG;

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    return isLang(saved) ? saved : (LEGACY_LABELS[saved] ?? SOURCE_LANG);
  } catch {
    return fallback;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Cookie read by Google Translate: "/fr/de" translates the page from French to German. */
export function setTranslateCookie(lang: Lang) {
  const host = location.hostname;
  const domains = ["", `; domain=${host}`, `; domain=.${host.split(".").slice(-2).join(".")}`];
  for (const domain of domains) document.cookie = `googtrans=; path=/; max-age=0${domain}`;
  if (lang !== SOURCE_LANG) document.cookie = `googtrans=/${SOURCE_LANG}/${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** Selected language, shared with the static pages (same localStorage key). */
export function useLang() {
  const lang = useSyncExternalStore(subscribe, readLang, () => SOURCE_LANG);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const change = (next: Lang) => {
    if (next === lang) return;
    fallback = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setTranslateCookie(next);
    // Once Google Translate has rewritten the page, only a reload restores or re-translates it cleanly.
    if ((window as { google?: { translate?: unknown } }).google?.translate) {
      location.reload();
      return;
    }
    listeners.forEach((listener) => listener());
  };

  return [lang, change] as const;
}

/** Language of the hand-written texts: English, or French (machine-translated for the other languages). */
export const textLang = (lang: Lang): TextLang => (lang === "en" ? "en" : "fr");

/** On pages with hand-written English, keep Google Translate away from it. */
export const nativeTranslate = (lang: Lang) => (lang === "en" ? ("no" as const) : undefined);

type SwitchProps = {
  lang: Lang;
  onChange: (lang: Lang) => void;
  /** Menu opens upwards (floating switch at the bottom of the screen). */
  up?: boolean;
  /** Shows "FR" instead of "Français" to take less room. */
  compact?: boolean;
  /** Limits the menu to these languages (admin: French and English only). */
  only?: Lang[];
};

export function LangSwitch({ lang, onChange, up, compact, only }: SwitchProps) {
  const [open, setOpen] = useState(false);
  const options = only ? LANGUAGES.filter((l) => only.includes(l.code)) : LANGUAGES;
  const current = options.find((l) => l.code === lang) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`lang notranslate${open ? " open" : ""}${up ? " up" : ""}`} translate="no" data-react-lang="">
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Langue / Language: ${current.name}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Flag spec={current.flag} />
        <span className="lang-label">{compact ? current.code.toUpperCase() : current.name}</span> <Icon name="chev-down" />
      </button>
      <ul className="lang-menu">
        {options.map((option) => (
          <li key={option.code}>
            <button
              type="button"
              lang={option.code}
              aria-current={option.code === lang ? "true" : undefined}
              onClick={() => {
                setOpen(false);
                onChange(option.code);
              }}
            >
              <Flag spec={option.flag} /> {option.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
