"use client";

import { useEffect, useState } from "react";
import { SITE_LANGUAGES, type FlagSpec, type Lang, type SiteLang } from "@/config/languages";
import { useLang, useSiteLang } from "@/i18n/client";
import { Icon } from "./Icon";

export type { Lang, SiteLang };
export { useLang, useSiteLang };

/** Language of the hand-written chatbot texts: English, or French (machine-translated for the other languages). */
export const textLang = (lang: SiteLang): "fr" | "en" => (lang === "en" ? "en" : "fr");

/** Texts already written in the visitor's language must be kept away from Google Translate. */
export const nativeTranslate = (lang: SiteLang) => (lang === "en" ? ("no" as const) : undefined);

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
  } else if (spec.special === "cz") {
    body = (
      <>
        <rect width={30} height={10} fill="#fff" />
        <rect y={10} width={30} height={10} fill="#d7141a" />
        <path d="M0 0l15 10L0 20z" fill="#11457e" />
      </>
    );
  } else if (spec.special === "gr") {
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
  } else {
    body = (
      <>
        <rect width={30} height={20} fill="#012169" />
        <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth={4} />
        <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth={1.5} />
        <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth={6} />
        <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth={3.5} />
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

type SwitchProps = {
  /** Menu opens upwards (floating switch at the bottom of the screen). */
  up?: boolean;
  /** Shows "FR" instead of "Français" to take less room. */
  compact?: boolean;
};

/** Language menu. Other languages than French are translated by Google Translate (see SiteTranslator). */
export function LangSwitch({ up, compact }: SwitchProps) {
  const [lang, setLang] = useSiteLang();
  const [open, setOpen] = useState(false);
  const current = SITE_LANGUAGES.find((l) => l.code === lang) ?? SITE_LANGUAGES[0];

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
    <div className={`lang notranslate${open ? " open" : ""}${up ? " up" : ""}`} translate="no">
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
        {SITE_LANGUAGES.map((option) => (
          <li key={option.code}>
            <button
              type="button"
              lang={option.code}
              aria-current={option.code === lang ? "true" : undefined}
              onClick={() => {
                setOpen(false);
                setLang(option.code);
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
