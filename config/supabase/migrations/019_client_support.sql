-- =========================================================
-- AK UNIVERSE — Client space "Support": support requests (tickets) and their conversation
-- Requires 001 (profiles, touch_updated_at, is_admin).
--   * support_tickets   — one request: unique reference (SUP-xxxx), subject, category, priority, status.
--   * support_messages  — the conversation of a ticket (customer and support team), oldest first.
-- Customers read their own tickets / messages (RLS); every write goes through the server (service role) after the
-- session is verified. Admins can read everything (future support inbox). Files are not hosted (same rule as the
-- videographer space): a message can carry a link to a shared document instead.
-- Statuses: ouvert → en_cours → en_attente (waiting for the customer) → resolu → ferme.
-- =========================================================

create sequence if not exists public.support_ticket_seq start 1001;

create table if not exists public.support_tickets (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default ('SUP-' || nextval('public.support_ticket_seq')::text),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  subject           text not null check (char_length(subject) between 3 and 150),
  category          text not null check (category in ('offre', 'facturation', 'options', 'compte', 'technique', 'autre')),
  priority          text not null default 'normale' check (priority in ('normale', 'haute', 'urgente')),
  status            text not null default 'ouvert' check (status in ('ouvert', 'en_cours', 'en_attente', 'resolu', 'ferme')),
  last_activity_at  timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, last_activity_at desc);

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  author_role text not null check (author_role in ('client', 'support')),
  body        text not null check (char_length(body) between 1 and 5000),
  link_url    text check (link_url is null or (char_length(link_url) <= 2000 and link_url ~ '^https://')),
  created_at  timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function public.touch_updated_at();

alter table public.support_tickets  enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "support_tickets: read own" on public.support_tickets;
create policy "support_tickets: read own" on public.support_tickets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "support_messages: read own" on public.support_messages;
create policy "support_messages: read own" on public.support_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin()))
  );
