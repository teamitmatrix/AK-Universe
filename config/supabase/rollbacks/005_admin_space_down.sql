-- Rollback of 005_admin_space.sql — restores the exact pre-005 definitions (taken from the backup).
-- WARNING: deletes the commissions table and the staff assignment columns; staff accounts go back to role 'user'.
-- Run after 006/007/008 have been rolled back.

drop table if exists public.commissions;

drop policy if exists "video_projects: staff read assigned" on public.video_projects;
alter table public.video_projects
  drop column if exists commercial_id,
  drop column if exists videaste_id,
  drop column if exists deadline;

drop policy if exists "profiles: admin updates" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

update public.profiles set role = 'user' where role in ('commercial', 'videaste');
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
alter table public.profiles
  drop column if exists active,
  drop column if exists commission_rate,
  drop column if exists monthly_target_cents;
