-- =========================================================
-- AK UNIVERSE — Videographer rate cards (admin → vidéaste confirmation)
-- Requires 005 (videaste role) and 013 (is_active_videaste / is_admin).
--   * videaste_rate_cards   a proposed rate card sent by an admin to one videographer
--   * videaste_rate_items   line items; each is pending until the videographer confirms it
--   * confirm_rate_item()   the ONLY way a videographer marks a line confirmed (own card only)
--   * notifications         rate_card_sent
-- =========================================================

create table if not exists public.videaste_rate_cards (
  id           uuid primary key default gen_random_uuid(),
  videaste_id  uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 160),
  notes        text check (char_length(notes) <= 2000),
  sent_by      uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists videaste_rate_cards_videaste_idx on public.videaste_rate_cards (videaste_id, created_at desc);

create table if not exists public.videaste_rate_items (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.videaste_rate_cards (id) on delete cascade,
  label         text not null check (char_length(label) between 1 and 160),
  description   text check (char_length(description) <= 1000),
  amount_cents  integer not null check (amount_cents >= 0 and amount_cents <= 100000000),
  currency      text not null default 'EUR' check (currency in ('EUR')),
  sort_order    integer not null default 0,
  status        text not null default 'pending' check (status in ('pending', 'confirmed')),
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists videaste_rate_items_card_idx on public.videaste_rate_items (card_id, sort_order, created_at);

alter table public.videaste_rate_cards enable row level security;
alter table public.videaste_rate_items enable row level security;

create policy "videaste_rate_cards: admin all" on public.videaste_rate_cards
  for all using (public.is_admin()) with check (public.is_admin());
create policy "videaste_rate_cards: own videaste read" on public.videaste_rate_cards
  for select using (videaste_id = auth.uid() and public.is_active_videaste());

create policy "videaste_rate_items: admin all" on public.videaste_rate_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy "videaste_rate_items: own videaste read" on public.videaste_rate_items
  for select using (
    exists (
      select 1 from public.videaste_rate_cards c
       where c.id = card_id and c.videaste_id = auth.uid() and public.is_active_videaste()
    )
  );

-- Videographer confirms one pending line on their own card.
create or replace function public.confirm_rate_item(p_item uuid)
returns public.videaste_rate_items
language plpgsql
security definer set search_path = ''
as $$
declare
  r public.videaste_rate_items;
begin
  if not public.is_active_videaste() then
    raise exception 'forbidden';
  end if;
  update public.videaste_rate_items i
     set status = 'confirmed', confirmed_at = now()
    from public.videaste_rate_cards c
   where i.id = p_item
     and i.card_id = c.id
     and c.videaste_id = auth.uid()
     and i.status = 'pending'
  returning i.* into r;
  if not found then
    return null;
  end if;
  return r;
end;
$$;
revoke all on function public.confirm_rate_item(uuid) from public, anon;
grant execute on function public.confirm_rate_item(uuid) to authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'lead_assigned', 'quote_accepted', 'invoice_paid',
  'commission_validated', 'commission_paid', 'task_assigned', 'reminder_due',
  'project_assigned', 'version_reviewed', 'rate_card_sent'));
