/**
 * Languages of the site.
 *
 * French is the source language: every text is written in French in the code.
 *
 * For now the other languages come from Google Translate in the browser (SITE_LANGUAGES, the
 * language switch). Fixed, hand-checked translations (catalogues in app/i18n/catalogs/<code>/) are
 * ready for English and German but switched off with FIXED_TRANSLATIONS until the site is finished.
 *
 * To switch fixed translations back on later:
 *   1. set FIXED_TRANSLATIONS to true;
 *   2. run `npm run check:i18n` to list texts added since then that still need a translation.
 */

/** false: pages are always rendered in French and Google Translate does the other languages. */
export const FIXED_TRANSLATIONS = false;

/** Flag drawn in a 30×20 box: stripes ("v" vertical, "h" horizontal) with optional weights, or a special design. */
export type FlagSpec =
  | { stripes: "v" | "h"; colors: string[]; weights?: number[] }
  | { cross: string; bg: string }
  | { special: "uk" | "cz" | "gr" };

/** Languages with a fixed catalogue (French text → translation). */
export const LANGUAGES = [
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "en", name: "English", locale: "en-GB" },
  { code: "de", name: "Deutsch", locale: "de-DE" },
] as const satisfies readonly { code: string; name: string; locale: string }[];

/** Language of the texts written in the code / catalogues. */
export type Lang = (typeof LANGUAGES)[number]["code"];

export const SOURCE_LANG: Lang = "fr";

/** Cookie holding the visitor's choice in the language switch (any SiteLang). */
export const LANG_COOKIE = "aku-lang";

export const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.code === value);

/** Locale used for dates and numbers ("fr-FR", "en-GB"). */
export const localeOf = (lang: Lang) => LANGUAGES.find((l) => l.code === lang)?.locale ?? "fr-FR";

/** Language switch: 24 official EU languages, plus Hindi and Urdu, translated by Google Translate. */
export const SITE_LANGUAGES = [
  { code: "fr", name: "Français", flag: { stripes: "v", colors: ["#1f4fb4", "#fff", "#e03a3e"] } },
  { code: "en", name: "English", flag: { special: "uk" } },
  { code: "bg", name: "Български", flag: { stripes: "h", colors: ["#fff", "#00966e", "#d62612"] } },
  { code: "hr", name: "Hrvatski", flag: { stripes: "h", colors: ["#ff0000", "#fff", "#171796"] } },
  { code: "cs", name: "Čeština", flag: { special: "cz" } },
  { code: "da", name: "Dansk", flag: { cross: "#fff", bg: "#c8102e" } },
  { code: "nl", name: "Nederlands", flag: { stripes: "h", colors: ["#ae1c28", "#fff", "#21468b"] } },
  { code: "et", name: "Eesti", flag: { stripes: "h", colors: ["#0072ce", "#000", "#fff"] } },
  { code: "fi", name: "Suomi", flag: { cross: "#002f6c", bg: "#fff" } },
  { code: "de", name: "Deutsch", flag: { stripes: "h", colors: ["#000", "#dd0000", "#ffce00"] } },
  { code: "el", name: "Ελληνικά", flag: { special: "gr" } },
  { code: "hu", name: "Magyar", flag: { stripes: "h", colors: ["#ce2939", "#fff", "#477050"] } },
  { code: "ga", name: "Gaeilge", flag: { stripes: "v", colors: ["#169b62", "#fff", "#ff883e"] } },
  { code: "it", name: "Italiano", flag: { stripes: "v", colors: ["#009246", "#fff", "#ce2b37"] } },
  { code: "lv", name: "Latviešu", flag: { stripes: "h", colors: ["#9e3039", "#fff", "#9e3039"], weights: [2, 1, 2] } },
  { code: "lt", name: "Lietuvių", flag: { stripes: "h", colors: ["#fdb913", "#006a44", "#c1272d"] } },
  { code: "mt", name: "Malti", flag: { stripes: "v", colors: ["#fff", "#cf142b"] } },
  { code: "pl", name: "Polski", flag: { stripes: "h", colors: ["#fff", "#dc143c"] } },
  { code: "pt", name: "Português", flag: { stripes: "v", colors: ["#006600", "#ff0000"], weights: [2, 3] } },
  { code: "ro", name: "Română", flag: { stripes: "v", colors: ["#002b7f", "#fcd116", "#ce1126"] } },
  { code: "sk", name: "Slovenčina", flag: { stripes: "h", colors: ["#fff", "#0b4ea2", "#ee1c25"] } },
  { code: "sl", name: "Slovenščina", flag: { stripes: "h", colors: ["#fff", "#005ce5", "#ed1c24"] } },
  { code: "es", name: "Español", flag: { stripes: "h", colors: ["#aa151b", "#f1bf00", "#aa151b"], weights: [1, 2, 1] } },
  { code: "sv", name: "Svenska", flag: { cross: "#fecc00", bg: "#006aa7" } },
  { code: "hi", name: "हिन्दी", flag: { stripes: "h", colors: ["#ff9933", "#fff", "#138808"] } },
  { code: "ur", name: "اردو", flag: { stripes: "v", colors: ["#fff", "#01411c"], weights: [1, 3] } },
] as const satisfies readonly { code: string; name: string; flag: FlagSpec }[];

/** Language chosen in the switch (Google Translate target, chatbot language, Stripe Checkout locale). */
export type SiteLang = (typeof SITE_LANGUAGES)[number]["code"];

export const isSiteLang = (value: unknown): value is SiteLang => SITE_LANGUAGES.some((l) => l.code === value);
