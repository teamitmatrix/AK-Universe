import { NextResponse } from "next/server";
import { isLang, SOURCE_LANG } from "@/config/languages";
import { buildSystemPrompt, getChatbotSettings } from "@/lib/chatbot/knowledge";

/*
 * Site chatbot (components/ui/ChatWidget.tsx). Public endpoint:
 * GET tells the widget whether to show itself, POST streams the answer as plain text.
 */

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1500;
const MAX_ANSWER_TOKENS = 600;

/** Anti-abuse, per server instance: at most this many messages per IP in the window below. */
const MAX_PER_IP = 20;
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

type ChatMessage = { role: "user" | "assistant"; content: string };

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const messages = raw
    .slice(-MAX_MESSAGES)
    .filter(
      (m): m is ChatMessage =>
        (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim() !== ""
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }));
  return messages.at(-1)?.role === "user" ? messages : null;
}

export async function GET() {
  const { enabled } = await getChatbotSettings();
  return NextResponse.json(
    { enabled: enabled && Boolean(process.env.OPENAI_API_KEY) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const settings = await getChatbotSettings();
  if (!apiKey || !settings.enabled) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { messages?: unknown; lang?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const messages = parseMessages(body.messages);
  if (!messages) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const lang = typeof body.lang === "string" && isLang(body.lang) ? body.lang : SOURCE_LANG;

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      max_completion_tokens: MAX_ANSWER_TOKENS,
      messages: [{ role: "system", content: await buildSystemPrompt(settings.knowledge, lang) }, ...messages],
    }),
    signal: request.signal,
  }).catch((cause) => {
    console.error("OpenAI request failed:", cause);
    return null;
  });
  if (!upstream?.ok || !upstream.body) {
    if (upstream) console.error("OpenAI error:", upstream.status, (await upstream.text()).slice(0, 500));
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  // OpenAI sends server-sent events; forward only the text deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const text = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.startsWith("data:") ? line.slice(5).trim() : "";
          if (!data || data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {}
        }
      },
    })
  );

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
