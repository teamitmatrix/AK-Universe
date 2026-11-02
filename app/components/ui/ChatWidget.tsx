"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { textLang, useLang } from "./LangSwitch";

/*
 * Floating site assistant, above the language switch. Answers come from /api/chat
 * (knowledge edited on /admin?vue=chatbot); the widget stays hidden until it is switched on there.
 */

const STORAGE_KEY = "aku-chat";
const HIDDEN_ON = ["/admin"];

type Message = { role: "user" | "assistant"; content: string };

const TEXT = {
  fr: {
    open: "Une question ? Discutons",
    close: "Fermer le chat",
    title: "Assistant AK Universe",
    subtitle: "Réponse immédiate, 24h/24",
    hello: "Bonjour ! Je peux vous renseigner sur nos vidéos, nos agents IA, les tarifs ou le déroulement d'un projet. Que puis-je faire pour vous ?",
    suggestions: ["Combien coûte une vidéo d'entreprise ?", "Comment fonctionnent les agents IA ?", "Comment réserver un tournage ?"],
    placeholder: "Écrivez votre message…",
    send: "Envoyer",
    reset: "Nouvelle conversation",
    error: "Désolé, je ne peux pas répondre pour le moment. Réessayez dans un instant ou demandez un devis sur /projet.",
    rateLimited: "Vous avez envoyé beaucoup de messages. Merci de patienter quelques minutes.",
    disclaimer: "Assistant IA : vérifiez les informations importantes sur votre devis.",
  },
  en: {
    open: "Questions? Let's chat",
    close: "Close chat",
    title: "AK Universe assistant",
    subtitle: "Instant answers, 24/7",
    hello: "Hello! I can help with our videos, AI agents, prices or how a project works. What can I do for you?",
    suggestions: ["How much does a corporate video cost?", "How do the AI agents work?", "How do I book a shoot?"],
    placeholder: "Type your message…",
    send: "Send",
    reset: "New conversation",
    error: "Sorry, I can't answer right now. Please try again shortly or request a quote at /projet.",
    rateLimited: "You've sent a lot of messages. Please wait a few minutes.",
    disclaimer: "AI assistant: check important details on your quote.",
  },
};

/** Turns site paths (/services) and full URLs in an answer into links. */
function linkify(text: string): ReactNode[] {
  return text.split(/(https?:\/\/[^\s)]+|\/[\w\-/]+(?:\.html)?(?:[?#][^\s).,]*)?)/g).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} {...(part.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {part}
      </a>
    ) : (
      part
    )
  );
}

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((m) => m?.content) : [];
  } catch {
    return [];
  }
}

export function ChatWidget() {
  const pathname = usePathname();
  const [lang] = useLang();
  const t = TEXT[textLang(lang)];
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => setEnabled(data.enabled === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!enabled || HIDDEN_ON.includes(pathname)) return null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history: Message[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const reply = (content: string) =>
      setMessages((current) => [...current.slice(0, -1), { role: "assistant", content }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lang }),
      });
      if (!res.ok || !res.body) {
        reply(res.status === 429 ? t.rateLimited : t.error);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        reply(answer);
      }
      if (!answer.trim()) reply(t.error);
    } catch {
      reply(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-widget notranslate" translate="no">
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-label={t.title}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <header className="chat-head">
            <span className="chat-avatar" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- small logo, same as the static site */}
              <img src="/assets/img/logo-mark-new.png" alt="" width={28} height={28} />
            </span>
            <div>
              <b>{t.title}</b>
              <small>{t.subtitle}</small>
            </div>
            {messages.length > 0 && (
              <button type="button" className="chat-reset" onClick={() => setMessages([])} disabled={busy}>
                {t.reset}
              </button>
            )}
            <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label={t.close}>
              ×
            </button>
          </header>

          <div className="chat-messages" ref={listRef} aria-live="polite">
            <p className="chat-msg assistant">{t.hello}</p>
            {messages.length === 0 && (
              <div className="chat-suggestions">
                {t.suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <p key={i} className={`chat-msg ${m.role}`}>
                {m.content ? linkify(m.content) : <span className="chat-typing" aria-label="…" />}
              </p>
            ))}
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={1500}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()} aria-label={t.send}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M3 11.5 20 4l-7.5 17-2-7.5z" fill="currentColor" />
              </svg>
            </button>
          </form>
          <small className="chat-disclaimer">{t.disclaimer}</small>
        </section>
      )}

      <button
        type="button"
        className="chat-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t.close : t.open}
      >
        {open ? (
          <span aria-hidden="true">×</span>
        ) : (
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.3A2.5 2.5 0 0 1 4 13.5z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
