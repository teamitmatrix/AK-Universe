"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  dictateOnce,
  ensureMicAccess,
  listenForUtterance,
  MicPermissionError,
  micSupported,
  speakReply,
} from "./chatVoice";
import { nativeTranslate, textLang, useLang } from "./LangSwitch";

/*
 * Floating site assistant, above the language switch. Answers come from /api/chat in the language chosen
 * on the site (knowledge edited on /admin?vue=chatbot); the widget stays hidden until it is switched on there.
 * Voice: language-aware dictation into the field, plus a live voice conversation mode (listen → answer → speak).
 */

const STORAGE_KEY = "aku-chat";
const NUDGE_KEY = "aku-chat-nudge";
const HIDDEN_ON = ["/admin"];

type Message = { role: "user" | "assistant"; content: string };
type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

const TEXT = {
  fr: {
    open: "Une question ? Discutons",
    close: "Fermer le chat",
    title: "Assistant AK Universe",
    subtitle: "Réponse immédiate, 24h/24",
    nudge: "Bonjour, comment puis-je vous aider ?",
    nudgeDismiss: "Masquer",
    hello: "Bonjour ! Je peux vous renseigner sur nos vidéos, nos agents IA, les tarifs ou le déroulement d'un projet. Que puis-je faire pour vous ?",
    suggestions: ["Combien coûte une vidéo d'entreprise ?", "Comment fonctionnent les agents IA ?", "Comment réserver un tournage ?"],
    placeholder: "Écrivez votre message…",
    send: "Envoyer",
    reset: "Nouvelle conversation",
    error: "Désolé, je ne peux pas répondre pour le moment. Réessayez dans un instant ou demandez un devis sur /contact.",
    rateLimited: "Vous avez envoyé beaucoup de messages. Merci de patienter quelques minutes.",
    disclaimer: "Assistant IA : vérifiez les informations importantes sur votre devis.",
    voiceInput: "Parler pour écrire",
    voiceInputStop: "Arrêter l'écoute",
    voiceInputUnsupported: "La dictée n'est pas disponible sur ce navigateur.",
    voiceLive: "Discussion vocale",
    voiceLiveEnd: "Terminer l'appel",
    voiceListening: "Je vous écoute…",
    voiceThinking: "Un instant…",
    voiceSpeaking: "Réponse en cours…",
    voiceHint: "Parlez naturellement. L'assistant répond à voix haute.",
    voiceMicDenied: "Autorisez le micro pour utiliser la voix.",
  },
  en: {
    open: "Questions? Let's chat",
    close: "Close chat",
    title: "AK Universe assistant",
    subtitle: "Instant answers, 24/7",
    nudge: "Hi, how can I help you?",
    nudgeDismiss: "Dismiss",
    hello: "Hello! I can help with our videos, AI agents, prices or how a project works. What can I do for you?",
    suggestions: ["How much does a corporate video cost?", "How do the AI agents work?", "How do I book a shoot?"],
    placeholder: "Type your message…",
    send: "Send",
    reset: "New conversation",
    error: "Sorry, I can't answer right now. Please try again shortly or request a quote at /projet.",
    rateLimited: "You've sent a lot of messages. Please wait a few minutes.",
    disclaimer: "AI assistant: check important details on your quote.",
    voiceInput: "Speak to type",
    voiceInputStop: "Stop listening",
    voiceInputUnsupported: "Dictation isn't available in this browser.",
    voiceLive: "Live voice chat",
    voiceLiveEnd: "End call",
    voiceListening: "Listening…",
    voiceThinking: "Thinking…",
    voiceSpeaking: "Speaking…",
    voiceHint: "Speak naturally. The assistant replies out loud.",
    voiceMicDenied: "Allow the microphone to use voice.",
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
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [voiceLive, setVoiceLive] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceInterim, setVoiceInterim] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef(messages);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const voiceLoopRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const canVoice = micSupported();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    fetch("/api/chat")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => setEnabled(data.enabled === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled || open) return;
    try {
      if (sessionStorage.getItem(NUDGE_KEY) === "1") return;
    } catch {}
    const timer = window.setTimeout(() => setNudgeVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [enabled, open]);

  function dismissNudge() {
    setNudgeVisible(false);
    try {
      sessionStorage.setItem(NUDGE_KEY, "1");
    } catch {}
  }

  function openChat() {
    dismissNudge();
    setOpen(true);
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (open && !voiceLive) inputRef.current?.focus();
  }, [open, voiceLive]);

  useEffect(() => {
    return () => {
      voiceLoopRef.current = false;
      voiceAbortRef.current?.abort();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    };
  }, []);

  if (!enabled || HIDDEN_ON.includes(pathname)) return null;

  async function send(text: string): Promise<string | null> {
    const content = text.trim();
    if (!content || busy) return null;
    const history: Message[] = [...messagesRef.current, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const reply = (next: string) =>
      setMessages((current) => [...current.slice(0, -1), { role: "assistant", content: next }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lang }),
      });
      if (!res.ok || !res.body) {
        const err = res.status === 429 ? t.rateLimited : t.error;
        reply(err);
        return err;
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
      if (!answer.trim()) {
        reply(t.error);
        return t.error;
      }
      return answer;
    } catch {
      reply(t.error);
      return t.error;
    } finally {
      setBusy(false);
    }
  }

  async function toggleDictate() {
    if (dictating || busy || voiceLive) return;
    if (!canVoice) {
      setVoiceError(t.voiceInputUnsupported);
      return;
    }
    setVoiceError("");
    setDictating(true);
    try {
      const spoken = await dictateOnce(lang, (interim) => setInput(interim));
      if (spoken) {
        setInput(spoken);
        inputRef.current?.focus();
      }
    } catch (err) {
      setVoiceError(err instanceof MicPermissionError ? t.voiceMicDenied : t.voiceInputUnsupported);
    } finally {
      setDictating(false);
    }
  }

  function stopVoiceLive() {
    voiceLoopRef.current = false;
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setVoiceLive(false);
    setVoicePhase("idle");
    setVoiceInterim("");
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  async function startVoiceLive() {
    if (busy || dictating || voiceLive) return;
    if (!canVoice) {
      setVoiceError(t.voiceMicDenied);
      return;
    }
    setVoiceError("");

    // Request the mic immediately on the click (user gesture) so the browser prompt works.
    let stream: MediaStream;
    try {
      stream = await ensureMicAccess();
    } catch {
      setVoiceError(t.voiceMicDenied);
      return;
    }
    micStreamRef.current = stream;

    openChat();
    setVoiceLive(true);
    voiceLoopRef.current = true;
    const controller = new AbortController();
    voiceAbortRef.current = controller;

    // Greet once when the call starts.
    setVoicePhase("speaking");
    try {
      await speakReply(t.hello, lang, controller.signal);
    } catch {}

    while (voiceLoopRef.current && !controller.signal.aborted) {
      setVoicePhase("listening");
      setVoiceInterim("");
      let heard: string | null = null;
      try {
        heard = await listenForUtterance(lang, {
          signal: controller.signal,
          onInterim: setVoiceInterim,
          stream: micStreamRef.current,
        });
      } catch (err) {
        if (err instanceof MicPermissionError) {
          setVoiceError(t.voiceMicDenied);
          break;
        }
      }
      if (!voiceLoopRef.current || controller.signal.aborted) break;
      if (!heard) continue;

      setVoiceInterim(heard);
      setVoicePhase("thinking");
      const answer = await send(heard);
      if (!voiceLoopRef.current || controller.signal.aborted) break;
      if (!answer) continue;

      setVoicePhase("speaking");
      try {
        await speakReply(answer, lang, controller.signal);
      } catch {}
    }

    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setVoiceLive(false);
    setVoicePhase("idle");
    setVoiceInterim("");
  }

  const phaseLabel =
    voicePhase === "listening"
      ? t.voiceListening
      : voicePhase === "thinking"
        ? t.voiceThinking
        : voicePhase === "speaking"
          ? t.voiceSpeaking
          : "";

  return (
    // The widget's own texts follow the page translation; answers already come in the site language (/api/chat).
    <div className="chat-widget" translate={nativeTranslate(lang)}>
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-label={t.title}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (voiceLive) stopVoiceLive();
              else setOpen(false);
            }
          }}
        >
          <header className="chat-head">
            <span className="chat-avatar" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- small logo, same as the static site */}
              <img src="/assets/img/logo-mark-new.png" alt="" width={28} height={28} />
            </span>
            <div>
              <b>{t.title}</b>
              <small>{voiceLive ? phaseLabel || t.subtitle : t.subtitle}</small>
            </div>
            {messages.length > 0 && !voiceLive && (
              <button type="button" className="chat-reset" onClick={() => setMessages([])} disabled={busy}>
                {t.reset}
              </button>
            )}
            <button
              type="button"
              className="chat-close"
              onClick={() => {
                stopVoiceLive();
                setOpen(false);
              }}
              aria-label={t.close}
            >
              ×
            </button>
          </header>

          {voiceLive ? (
            <div className={`chat-voice-live chat-voice-${voicePhase}`} aria-live="polite">
              <div className="chat-voice-orb" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="chat-voice-status">{phaseLabel}</p>
              {voiceInterim ? <p className="chat-voice-interim notranslate">{voiceInterim}</p> : <p className="chat-voice-hint">{t.voiceHint}</p>}
              <button type="button" className="chat-voice-end btn btn-primary" onClick={stopVoiceLive}>
                {t.voiceLiveEnd}
              </button>
            </div>
          ) : (
            <div className="chat-messages" ref={listRef} aria-live="polite">
              <p className="chat-msg assistant">{t.hello}</p>
              {messages.length === 0 && (
                <div className="chat-suggestions">
                  {t.suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => void send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <p key={i} className={`chat-msg ${m.role} notranslate`} translate="no">
                  {m.content ? linkify(m.content) : <span className="chat-typing" aria-label="…" />}
                </p>
              ))}
            </div>
          )}

          {!voiceLive && (
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <button
                type="button"
                className={`chat-mic${dictating ? " is-on" : ""}`}
                onClick={() => void toggleDictate()}
                disabled={busy || !canVoice}
                aria-pressed={dictating}
                aria-label={dictating ? t.voiceInputStop : t.voiceInput}
                title={canVoice ? (dictating ? t.voiceInputStop : t.voiceInput) : t.voiceInputUnsupported}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={1500}
                placeholder={dictating ? t.voiceListening : t.placeholder}
                aria-label={t.placeholder}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <button
                type="button"
                className="chat-live-btn"
                onClick={() => void startVoiceLive()}
                disabled={busy || dictating || !canVoice}
                aria-label={t.voiceLive}
                title={t.voiceLive}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    d="M12 3a4 4 0 0 1 4 4v1h1.5A2.5 2.5 0 0 1 20 10.5v1A6.5 6.5 0 0 1 13.5 18H13v2h3v2H8v-2h3v-2h-.5A6.5 6.5 0 0 1 4 11.5v-1A2.5 2.5 0 0 1 6.5 8H8V7a4 4 0 0 1 4-4z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()} aria-label={t.send}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M3 11.5 20 4l-7.5 17-2-7.5z" fill="currentColor" />
                </svg>
              </button>
            </form>
          )}
          {voiceError ? <small className="chat-disclaimer chat-voice-error">{voiceError}</small> : <small className="chat-disclaimer">{t.disclaimer}</small>}
        </section>
      )}

      {!open && nudgeVisible && (
        <div className="chat-nudge" role="status">
          <button type="button" className="chat-nudge-text" onClick={openChat}>
            {t.nudge}
          </button>
          <button type="button" className="chat-nudge-close" onClick={dismissNudge} aria-label={t.nudgeDismiss}>
            ×
          </button>
        </div>
      )}

      <button
        type="button"
        className="chat-toggle"
        onClick={() => {
          if (open) {
            stopVoiceLive();
            setOpen(false);
          } else {
            openChat();
          }
        }}
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
