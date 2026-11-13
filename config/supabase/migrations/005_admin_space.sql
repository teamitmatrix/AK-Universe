-- =========================================================
-- AK UNIVERSE — Admin space (dashboard, commerciaux, vidéastes)
-- Extends the existing tables instead of creating a parallel admin schema:
--   * profiles      → two staff roles, an active flag, sales targets / commission rate
--   * video_projects → assigned commercial, assigned videographer, deadline
--   * commissions    → one row per commission owed to a commercial
-- Safe to run once on top of 001–004.
-- =========================================================

-- ---------- Staff roles on the existing profiles table ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin', 'commercial', 'videaste'));

alter table public.profiles
  add column if not exists active               boolean not null default true,
  add column if not exists commission_rate      numeric(5, 2) check (commission_rate between 0 and 100),
  add column if not exists monthly_target_cents integer check (monthly_target_cents >= 0);

-- A deactivated admin loses every admin right at once, even with a still-valid session.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

-- Users still cannot change their own role or active flag (policy "profiles: update own").
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role   = (select p.role   from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );
create policy "profiles: admin updates" on public.profiles
  for update using (public.is_admin());

-- ---------- Assignment on the existing video_projects table ----------
alter table public.video_projects
  add column if not exists commercial_id uuid references public.profiles (id) on delete set null,
  add column if not exists videaste_id   uuid references public.profiles (id) on delete set null,
  add column if not exists deadline      date;

create index if not exists video_projects_commercial_idx on public.video_projects (commercial_id);
create index if not exists video_projects_videaste_idx   on public.video_projects (videaste_id);

-- Staff see only the projects assigned to them (admins already see all via "read own").
create policy "video_projects: staff read assigned" on public.video_projects
  for select using (commercial_id = auth.uid() or videaste_id = auth.uid());

-- ---------- Commissions ----------
create table if not exists public.commissions (
  id              uuid primary key default gen_random_uuid(),
  commercial_id   uuid not null references public.profiles (id) on delete cascade,
  project_id      uuid references public.video_projects (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents    integer not null check (amount_cents >= 0),
  status          text not null default 'en_attente'
                    check (status in ('en_attente', 'validee', 'a_payer', 'payee')),
  validated_at    timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists commissions_commercial_idx on public.commissions (commercial_id, created_at desc);

create trigger commissions_touch before update on public.commissions
  for each row execute function public.touch_updated_at();

alter table public.commissions enable row level security;

create policy "commissions: read own or admin" on public.commissions
  for select using (commercial_id = auth.uid() or public.is_admin());
create policy "commissions: admin insert" on public.commissions
  for insert with check (public.is_admin());
create policy "commissions: admin update" on public.commissions
  for update using (public.is_admin());
create policy "commissions: admin delete" on public.commissions
  for delete using (public.is_admin());
