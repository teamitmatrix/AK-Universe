import { NextResponse } from "next/server";
import { isLang } from "@/config/languages";
import { builtInWidgetText, isWidgetText, WIDGET_TEXT, type WidgetText } from "@/lib/chatbot/widgetText";

/*
 * Chat widget texts for the site languages that have no hand-written version (lib/chatbot/widgetText.ts).
 * GET ?lang=de → WidgetText, translated once from English by OpenAI and kept in memory per server instance.
 */

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const cache = new Map<string, Promise<WidgetText | null>>();

function languageName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

async function translate(lang: string, apiKey: string): Promise<WidgetText | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You translate the interface texts of a website chat assistant into ${languageName(lang)}. Return a JSON object with exactly the same keys and the same structure (the "suggestions" array keeps 3 items). Use natural, polite, native wording and the native script. Keep "AK Universe" (you may transliterate it), "24/7", the ellipsis "…" and site paths such as /contact exactly as they are.`,
        },
        { role: "user", content: JSON.stringify(WIDGET_TEXT.en) },
      ],
    }),
  }).catch(() => null);
  if (!res?.ok) {
    if (res) console.error("Chat UI translation error:", res.status, (await res.text()).slice(0, 300));
    return null;
  }
  try {
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "");
    return isWidgetText(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") ?? "";
  if (!isLang(lang)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const builtIn = builtInWidgetText(lang);
  if (builtIn) return NextResponse.json(builtIn, { headers: { "Cache-Control": "public, max-age=86400" } });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  let pending = cache.get(lang);
  if (!pending) {
    pending = translate(lang, apiKey);
    cache.set(lang, pending);
  }
  const text = await pending;
  if (!text) {
    cache.delete(lang); // retry on the next request
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
  return NextResponse.json(text, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
}
