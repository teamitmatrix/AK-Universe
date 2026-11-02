"use client";

import Link from "next/link";
import { LangSwitch, textLang, useLang } from "@/components/ui/LangSwitch";
import { ADMIN_TEXT } from "./adminText";

const TABS = ["prix", "demandes", "chatbot"] as const;

/** Admin tabs + French/English switch (same language choice as the rest of the site). */
export function AdminNav({ tab }: { tab: (typeof TABS)[number] }) {
  const [lang, setLang] = useLang();
  const t = ADMIN_TEXT[textLang(lang)];

  return (
    <nav className="container admin-tabs notranslate" translate="no" aria-label="Admin">
      {TABS.map((id) => (
        <Link
          key={id}
          href={id === "prix" ? "/admin" : `/admin?vue=${id}`}
          className={`btn ${tab === id ? "btn-primary" : "btn-outline"}`}
          aria-current={tab === id ? "page" : undefined}
        >
          {t.tabs[id]}
        </Link>
      ))}
      <Link href="/" className="admin-tabs-site">
        {t.viewSite}
      </Link>
      <LangSwitch lang={textLang(lang)} onChange={setLang} only={["fr", "en"]} />
    </nav>
  );
}
