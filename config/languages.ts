/**
 * Languages offered in the language switch (the 24 official EU languages).
 * French is the source language of the site. Pages rebuilt in React also ship hand-written English;
 * every other language (and English on the static pages) is machine-translated by Google Translate.
 */

/** Flag drawn in a 30×20 box: stripes ("v" vertical, "h" horizontal) with optional weights, or a special design. */
export type FlagSpec =
  | { stripes: "v" | "h"; colors: string[]; weights?: number[] }
  | { cross: string; bg: string }
  | { special: "uk" | "cz" | "gr" };

export const LANGUAGES = [
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
] as const satisfies readonly { code: string; name: string; flag: FlagSpec }[];

export type Lang = (typeof LANGUAGES)[number]["code"];

/** Languages with hand-written texts in the React pages; the others start from French. */
export type TextLang = "fr" | "en";

export const SOURCE_LANG: Lang = "fr";

export const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.code === value);
