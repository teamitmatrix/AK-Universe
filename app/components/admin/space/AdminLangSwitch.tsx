"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LANG_COOKIE, type TextLang } from "@/config/languages";
import { LangSwitch, textLang, useLang, type Lang } from "@/components/ui/LangSwitch";

/**
 * Admin header switch. `initialLang` comes from the server (cookie) so the first paint matches.
 * Changing language writes localStorage + cookie, then refreshes so server copy updates.
 */
export function AdminLangSwitch({ initialLang, compact = true }: { initialLang: TextLang; compact?: boolean }) {
  const [stored, setStored] = useLang();
  const router = useRouter();

  // If localStorage already says English (or French) but the cookie was missing, sync once.
  useEffect(() => {
    const want = textLang(stored);
    if (want === initialLang) return;
    document.cookie = `${LANG_COOKIE}=${want}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [stored, initialLang, router]);

  const onChange = (next: Lang) => {
    const admin = textLang(next);
    setStored(admin);
    document.cookie = `${LANG_COOKIE}=${admin}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return <LangSwitch lang={initialLang} onChange={onChange} compact={compact} only={["fr", "en"]} />;
}
