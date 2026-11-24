-- =========================================================
-- AK UNIVERSE — Terms of Sale acceptance proof
-- Requires 001 (subscriptions, video_projects, profiles).
--   * subscriptions: snapshot of CGV acceptance at checkout
--   * terms_acceptances: durable audit log (subscription + project deposit)
-- =========================================================

alter table public.subscriptions
  add column if not exists terms_accepted boolean,
  add column if not exists terms_version text,
  add column if not exists terms_label text,
  add column if not exists terms_accepted_at timestamptz;

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('subscription', 'project_deposit')),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  project_id uuid references public.video_projects (id) on delete set null,
  plan text,
  cycle text,
  extra_users integer,
  options jsonb not null default '[]'::jsonb,
  terms_version text not null,
  terms_label text not null,
  accepted boolean not null check (accepted = true),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists terms_acceptances_user_idx on public.terms_acceptances (user_id, accepted_at desc);
create index if not exists terms_acceptances_subscription_idx on public.terms_acceptances (subscription_id);
create index if not exists terms_acceptances_project_idx on public.terms_acceptances (project_id);

alter table public.terms_acceptances enable row level security;

-- Customers may read their own acceptance records; writes are service-role only (checkout actions).
do $$ begin
  create policy "terms_acceptances: read own"
    on public.terms_acceptances for select
    using (auth.uid() = user_id or public.is_admin());
exception when duplicate_object then null;
end $$;
