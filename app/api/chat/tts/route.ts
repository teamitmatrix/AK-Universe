import { NextResponse } from "next/server";
import { isLang, SOURCE_LANG } from "@/config/languages";
import { speechLanguageName } from "@/lib/chatbot/speechLocales";
import { getChatbotSettings } from "@/lib/chatbot/knowledge";

/*
 * Text-to-speech for the site chatbot live voice mode.
 * POST { text, lang } → audio/mpeg from OpenAI.
 */

const MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const VOICE = process.env.OPENAI_TTS_VOICE || "coral";
const MAX_CHARS = 2000;
const MAX_PER_IP = 30;
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_IP;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const settings = await getChatbotSettings();
  if (!apiKey || !settings.enabled) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { text?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : "";
  if (!text) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const lang = typeof body.lang === "string" && isLang(body.lang) ? body.lang : SOURCE_LANG;
  const language = speechLanguageName(lang);

  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: text,
      response_format: "mp3",
      instructions: `Speak naturally in ${language}. Clear, warm, professional tone suitable for a business assistant.`,
    }),
    signal: request.signal,
  }).catch((cause) => {
    console.error("TTS request failed:", cause);
    return null;
  });

  if (!upstream?.ok || !upstream.body) {
    // Older accounts / models may reject gpt-4o-mini-tts instructions — retry with tts-1.
    const fallback = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: "nova", input: text, response_format: "mp3" }),
      signal: request.signal,
    }).catch(() => null);
    if (!fallback?.ok || !fallback.body) {
      if (upstream) console.error("TTS error:", upstream.status, (await upstream.text()).slice(0, 400));
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    return new Response(fallback.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
