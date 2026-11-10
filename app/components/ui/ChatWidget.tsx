"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  dictateOnce,
  ensureMicAccess,
  listenForUtterance,
  MicPermissionError,
  micSupported,
  speakReply,
} from "./chatVoice";
import { nativeTranslate, textLang, useLang, type Lang } from "./LangSwitch";
import { builtInWidgetText, isRtl, isWidgetText, WIDGET_TEXT, type WidgetText } from "@/lib/chatbot/widgetText";

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

const UI_CACHE_PREFIX = "aku-chat-ui-v1-";

function readCachedText(lang: Lang): WidgetText | null {
  try {
    const cached = JSON.parse(localStorage.getItem(UI_CACHE_PREFIX + lang) ?? "null");
    return isWidgetText(cached) ? cached : null;
  } catch {
    return null;
  }
}

/**
 * Widget texts in the site language. Hand-written ones are immediate; the others are fetched (and kept in
 * localStorage) from /api/chat/ui. `native` = the texts are already in the right language, so Google Translate
 * must keep away. `ready` stays false while fetching, so translated and native texts never swap under Google Translate.
 */
function useWidgetText(lang: Lang, enabled: boolean): { t: WidgetText; native: boolean; ready: boolean } {
  const builtIn = builtInWidgetText(lang);
  const [fetched, setFetched] = useState<{ lang: Lang; text: WidgetText | null } | null>(null);
  // Only read once the widget is enabled, i.e. in the browser after the first render.
  const cached = useMemo(() => (builtIn || !enabled ? null : readCachedText(lang)), [builtIn, enabled, lang]);

  useEffect(() => {
    if (builtIn || cached || !enabled) return;
    let cancelled = false;
    fetch(`/api/chat/ui?lang=${lang}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const text = isWidgetText(data) ? data : null;
        setFetched({ lang, text });
        if (text) {
          try {
            localStorage.setItem(UI_CACHE_PREFIX + lang, JSON.stringify(text));
          } catch {}
        }
      })
      .catch(() => !cancelled && setFetched({ lang, text: null }));
    return () => {
      cancelled = true;
    };
  }, [lang, builtIn, cached, enabled]);

  if (builtIn) return { t: builtIn, native: true, ready: true };
  if (cached) return { t: cached, native: true, ready: true };
  if (fetched?.lang === lang && fetched.text) return { t: fetched.text, native: true, ready: true };
  // Fallback: French texts, machine-translated by Google Translate with the rest of the page.
  return { t: WIDGET_TEXT[textLang(lang)], native: false, ready: fetched?.lang === lang };
}

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
  const [enabled, setEnabled] = useState(false);
  const { t, native, ready } = useWidgetText(lang, enabled);
  const dir = isRtl(lang) ? "rtl" : undefined;
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
  const dictateStopRef = useRef<AbortController | null>(null);
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
    const show = window.setTimeout(() => setNudgeVisible(true), 900);
    // Auto-hide so the bubble does not permanently cover offer prices/actions (e.g. /digital cards).
    const hide = window.setTimeout(() => {
      setNudgeVisible(false);
      try {
        sessionStorage.setItem(NUDGE_KEY, "1");
      } catch {}
    }, 6500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
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

  if (!enabled || !ready || HIDDEN_ON.includes(pathname)) return null;

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
    // Second click = stop now and keep what was said.
    if (dictating) {
      dictateStopRef.current?.abort();
      return;
    }
    if (busy || voiceLive) return;
    if (!canVoice) {
      setVoiceError(t.voiceInputUnsupported);
      return;
    }
    setVoiceError("");
    setDictating(true);
    const before = input.trim();
    const join = (text: string) => (before && text ? `${before} ${text}` : before || text);
    const stop = new AbortController();
    dictateStopRef.current = stop;
    try {
      const spoken = await dictateOnce(lang, (interim) => setInput(join(interim)), stop.signal);
      // Never leave a half-recognised phrase or an empty field behind: final text, else what was typed before.
      setInput(join(spoken ?? ""));
      inputRef.current?.focus();
    } catch (err) {
      setInput(before);
      setVoiceError(err instanceof MicPermissionError ? t.voiceMicDenied : t.voiceInputUnsupported);
    } finally {
      dictateStopRef.current = null;
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
    // Texts already in the site language (hand-written or from /api/chat/ui) are kept away from Google Translate;
    // answers always come in the site language (/api/chat).
    <div
      className={`chat-widget${native ? " notranslate" : ""}`}
      translate={native ? "no" : nativeTranslate(lang)}
      lang={native ? lang : undefined}
    >
      {open && (
        <section
          dir={dir}
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
                disabled={(busy && !dictating) || !canVoice}
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
                readOnly={dictating}
                dir={dir ?? "auto"}
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
        <div className="chat-nudge" role="status" dir={dir}>
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
