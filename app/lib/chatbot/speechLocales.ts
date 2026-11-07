import type { Lang } from "@/config/languages";

/**
 * BCP-47 tags for the Web Speech API, keyed by the site language switch.
 * Whisper / OpenAI audio use the bare ISO-639-1 codes (same as Lang).
 */
const SPEECH_LOCALES: Record<Lang, string> = {
  fr: "fr-FR",
  en: "en-GB",
  bg: "bg-BG",
  hr: "hr-HR",
  cs: "cs-CZ",
  da: "da-DK",
  nl: "nl-NL",
  et: "et-EE",
  fi: "fi-FI",
  de: "de-DE",
  el: "el-GR",
  hu: "hu-HU",
  ga: "ga-IE",
  it: "it-IT",
  lv: "lv-LV",
  lt: "lt-LT",
  mt: "mt-MT",
  pl: "pl-PL",
  pt: "pt-PT",
  ro: "ro-RO",
  sk: "sk-SK",
  sl: "sl-SI",
  es: "es-ES",
  sv: "sv-SE",
  hi: "hi-IN",
  ur: "ur-PK",
};

export function speechLocale(lang: string): string {
  return (SPEECH_LOCALES as Record<string, string>)[lang] ?? "fr-FR";
}

/** English display name for TTS voice instructions. */
export function speechLanguageName(lang: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(lang) ?? lang;
  } catch {
    return lang;
  }
}
