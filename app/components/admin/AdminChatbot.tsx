"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveChatbot } from "@/lib/admin/actions";
import type { ChatbotSettings } from "@/lib/chatbot/knowledge";
import { textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { ADMIN_TEXT } from "./adminText";

/** Knowledge the site assistant (components/ui/ChatWidget.tsx) answers from, saved to Supabase. */
export function AdminChatbot({ initial, maxChars, hasKey }: { initial: ChatbotSettings; maxChars: number; hasKey: boolean }) {
  const [settings, setSettings] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, toastNode] = useToast();
  const [lang] = useLang();
  const all = ADMIN_TEXT[textLang(lang)];
  const t = all.chatbot;

  const update = (patch: Partial<ChatbotSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  async function importFile(file: File | undefined) {
    if (!file) return;
    const text = (await file.text()).trim();
    update({ knowledge: settings.knowledge.trim() ? `${settings.knowledge.trim()}\n\n${text}` : text });
    toast(t.importDone);
  }

  function save() {
    startTransition(async () => {
      const result = await saveChatbot(settings);
      if (!result.success) return toast(all.errors[result.error]);
      setDirty(false);
      toast(t.saved);
    });
  }

  const tooLong = settings.knowledge.length > maxChars;

  return (
    <main className="container admin notranslate" translate="no">
      <h1>
        {t.title[0]}
        <span className="gold">{t.title[1]}</span>
      </h1>
      <p className="admin-note">{t.note}</p>
      {!hasKey && <p className="auth-error">{t.noKey}</p>}

      <label className="admin-chatbot-toggle">
        <input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        {t.enabled}
      </label>

      <div className="admin-chatbot-head">
        <h2>{t.knowledge}</h2>
        <label className="btn btn-outline">
          {t.importFile}
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <textarea
        className="admin-chatbot-text"
        value={settings.knowledge}
        placeholder={t.placeholder}
        onChange={(e) => update({ knowledge: e.target.value })}
        spellCheck
      />
      <small className={tooLong ? "admin-chatbot-count over" : "admin-chatbot-count"}>
        {t.chars(settings.knowledge.length, maxChars)}
      </small>

      <div className="admin-actions">
        <button className="btn btn-primary" onClick={save} disabled={pending || !dirty || tooLong}>
          <span key={String(pending)}>{pending ? t.saving : t.save}</span>
        </button>
        <Link className="btn btn-outline" href="/">
          {all.viewSite}
        </Link>
      </div>
      {toastNode}
    </main>
  );
}
