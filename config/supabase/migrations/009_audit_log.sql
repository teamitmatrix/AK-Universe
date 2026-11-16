-- =========================================================
-- AK UNIVERSE — Audit log of sensitive admin writes (handoff: "should not be skipped in production")
-- Requires 005_admin_space.sql. Append-only from the application: admins can insert their own entries and
-- read the log; nobody can update or delete rows through the API (no policy = denied).
-- =========================================================
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null check (char_length(action) between 1 and 80),
  target      text check (char_length(target) <= 200),
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log: admin read" on public.audit_log
  for select using (public.is_admin());
-- An admin can only write entries in their own name.
create policy "audit_log: admin insert" on public.audit_log
  for insert with check (public.is_admin() and actor_id = auth.uid());
