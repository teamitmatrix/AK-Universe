import { NextResponse } from "next/server";
import { isLang, SOURCE_LANG } from "@/config/languages";
import { getChatbotSettings } from "@/lib/chatbot/knowledge";

/*
 * Speech-to-text for the site chatbot (dictation fallback + live voice).
 * POST multipart: file (audio), optional lang → { text }.
 */

const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PER_IP = 40;
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const langRaw = form.get("lang");
  const lang = typeof langRaw === "string" && isLang(langRaw) ? langRaw : SOURCE_LANG;

  const payload = new FormData();
  payload.append("file", file, file.name || "speech.webm");
  payload.append("model", MODEL);
  payload.append("language", lang);
  payload.append("response_format", "json");

  let upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: payload,
    signal: request.signal,
  }).catch((cause) => {
    console.error("Transcribe request failed:", cause);
    return null;
  });

  // Fall back to whisper-1 if the preferred model is unavailable on this key.
  if (upstream && !upstream.ok && MODEL !== "whisper-1") {
    const retry = new FormData();
    retry.append("file", file, file.name || "speech.webm");
    retry.append("model", "whisper-1");
    retry.append("language", lang);
    retry.append("response_format", "json");
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: retry,
      signal: request.signal,
    }).catch(() => null);
  }

  if (!upstream?.ok) {
    if (upstream) console.error("Transcribe error:", upstream.status, (await upstream.text()).slice(0, 400));
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const data = (await upstream.json()) as { text?: string };
  const text = typeof data.text === "string" ? data.text.trim() : "";
  return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
}
