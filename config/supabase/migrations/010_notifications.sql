-- =========================================================
-- AK UNIVERSE — Per-user notification center (sales-portal handoff, page 05 "notifications")
-- Requires 005_admin_space.sql.
--   * One row per notification and per recipient, created ONLY by server code with the service key
--     (no insert policy): lead assigned, quote accepted (deposit paid), invoice paid (balance collected),
--     commission validated / paid, task assigned, reminder due.
--   * Each user reads only their own rows (RLS), so the feed is scoped in the database, not in the browser.
--   * Read state changes only through mark_notifications_read(), which can only touch the caller's rows.
--   * `ref` + unique (user_id, type, ref) makes every producer idempotent (a retried webhook = one row).
-- =========================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in (
                'lead_assigned', 'quote_accepted', 'invoice_paid',
                'commission_validated', 'commission_paid', 'task_assigned', 'reminder_due')),
  data        jsonb not null default '{}'::jsonb,
  link        text check (char_length(link) <= 300),
  ref         text check (char_length(ref) <= 120),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
-- Plain (not partial) so ON CONFLICT can use it; NULL refs never conflict with each other.
create unique index if not exists notifications_dedupe_key on public.notifications (user_id, type, ref);

alter table public.notifications enable row level security;

create policy "notifications: read own" on public.notifications
  for select using (user_id = auth.uid());

-- Marks the caller's notifications as read: the given ids, or all of them when p_ids is null.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  n integer;
begin
  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null
     and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Live pings to the open notification bell (Supabase Realtime applies the RLS policy above).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
