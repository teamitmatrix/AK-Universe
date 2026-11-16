"use client";

import { LangSwitch, textLang, useLang } from "@/components/ui/LangSwitch";

/** Admin header switch: French and English only, wired to the site language store. */
export function AdminLangSwitch({ compact = true }: { compact?: boolean }) {
  const [lang, setLang] = useLang();
  return <LangSwitch lang={textLang(lang)} onChange={setLang} compact={compact} only={["fr", "en"]} />;
}
