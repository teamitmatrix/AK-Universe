import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { buildCorpus, type Doc } from "./corpus";

/*
 * Retrieval for the site chatbot. The corpus (lib/chatbot/corpus.ts) is embedded with OpenAI and stored in
 * Supabase (chatbot_chunks, migration 004). Only new or changed passages are embedded again, so a sync is cheap.
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536; // must match vector(1536) in 004_chatbot_rag.sql
const EMBED_BATCH = 64;
/** Re-check the site content at most this often per server instance (admin saves force a sync). */
const SYNC_EVERY_MS = 5 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;
/** Passages sent to the model per question. */
const MATCH_COUNT = 6;
/** Below this cosine similarity a passage is unrelated to the question and is not sent. */
const MIN_SIMILARITY = 0.25;

export type Passage = Doc & { similarity?: number };

const hashOf = (d: Doc) =>
  createHash("sha256").update(`${EMBEDDING_MODEL}\n${d.source}\n${d.title}\n${d.url ?? ""}\n${d.content}`).digest("hex").slice(0, 24);

const embedText = (d: Doc) => `${d.title}\n${d.content}`;

async function embed(input: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: DIMENSIONS }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { data } = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function sync() {
  const db = createAdminClient();
  const wanted = new Map((await buildCorpus()).map((d) => [hashOf(d), d]));

  const { data, error } = await db.from("chatbot_chunks").select("hash");
  if (error) throw new Error(`chatbot_chunks: ${error.message}`);
  const have = new Set((data ?? []).map((r) => r.hash as string));

  // Insert before deleting, so a question asked during the sync always finds passages.
  const missing = [...wanted].filter(([hash]) => !have.has(hash));
  for (let i = 0; i < missing.length; i += EMBED_BATCH) {
    const batch = missing.slice(i, i + EMBED_BATCH);
    const vectors = await embed(batch.map(([, d]) => embedText(d)));
    const { error: insertError } = await db.from("chatbot_chunks").upsert(
      batch.map(([hash, d], j) => ({
        hash,
        source: d.source,
        title: d.title,
        url: d.url ?? null,
        content: d.content,
        embedding: JSON.stringify(vectors[j]),
      })),
      { onConflict: "hash", ignoreDuplicates: true }
    );
    if (insertError) throw new Error(`chatbot_chunks insert: ${insertError.message}`);
  }

  const stale = [...have].filter((hash) => !wanted.has(hash));
  for (let i = 0; i < stale.length; i += 100) {
    const { error: deleteError } = await db.from("chatbot_chunks").delete().in("hash", stale.slice(i, i + 100));
    if (deleteError) throw new Error(`chatbot_chunks delete: ${deleteError.message}`);
  }
  if (missing.length || stale.length) console.info(`Chatbot index: ${missing.length} added, ${stale.length} removed.`);
}

let nextSync = 0;
let running: Promise<void> | null = null;

/** Brings the index in line with the site content. `force` skips the per-instance delay (after an admin save). */
export function ensureIndex(force = false): Promise<void> {
  if (!force && Date.now() < nextSync) return Promise.resolve();
  running ??= sync()
    .then(() => {
      nextSync = Date.now() + SYNC_EVERY_MS;
    })
    .catch((cause) => {
      nextSync = Date.now() + RETRY_AFTER_FAILURE_MS;
      throw cause;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

type Match = { hash: string; source: string; title: string; url: string | null; content: string; similarity: number };

/**
 * Passages closest to the visitor's question. The previous question is searched too (fewer results),
 * so short follow-ups such as "and with a drone?" keep their context.
 */
export async function retrieve(question: string, previous?: string): Promise<Passage[]> {
  const queries = previous ? [question, `${previous}\n${question}`] : [question];
  const vectors = await embed(queries);
  const db = createAdminClient();
  const results = await Promise.all(
    vectors.map((v, i) =>
      db.rpc("match_chatbot_chunks", {
        query_embedding: JSON.stringify(v),
        match_count: i === 0 ? MATCH_COUNT : Math.ceil(MATCH_COUNT / 2),
        min_similarity: MIN_SIMILARITY,
      })
    )
  );
  const seen = new Map<string, Passage>();
  for (const { data, error } of results) {
    if (error) throw new Error(`match_chatbot_chunks: ${error.message}`);
    for (const m of (data ?? []) as Match[]) {
      if (!seen.has(m.hash)) {
        seen.set(m.hash, { source: m.source, title: m.title, url: m.url ?? undefined, content: m.content, similarity: m.similarity });
      }
    }
  }
  return [...seen.values()];
}
