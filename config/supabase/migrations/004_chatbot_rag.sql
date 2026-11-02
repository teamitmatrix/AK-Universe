-- Site chatbot retrieval (RAG): one row per knowledge chunk with its OpenAI embedding.
-- Written and searched by /api/chat with the service role only (no RLS policy = no public access).
-- The rows are rebuilt automatically from the site content (lib/chatbot/rag.ts): never edit them by hand.
create extension if not exists vector with schema extensions;

create table public.chatbot_chunks (
  hash        text primary key,            -- hash of model + content: unchanged chunks are never re-embedded
  source      text not null,               -- e.g. "service", "faq", "cgv", "admin"
  title       text not null,
  url         text,
  content     text not null,
  embedding   extensions.vector(1536) not null,
  created_at  timestamptz not null default now()
);

alter table public.chatbot_chunks enable row level security;

create index chatbot_chunks_embedding_idx on public.chatbot_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- Nearest chunks to a question, by cosine similarity (1 = identical).
create or replace function public.match_chatbot_chunks(
  query_embedding extensions.vector(1536),
  match_count int default 6,
  min_similarity float default 0
)
returns table (hash text, source text, title text, url text, content text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select c.hash, c.source, c.title, c.url, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from public.chatbot_chunks c
  where 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_chatbot_chunks(extensions.vector, int, float) from public, anon, authenticated;
