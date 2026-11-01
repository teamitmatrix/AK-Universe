-- =========================================================
-- AK UNIVERSE — initial schema
-- Run in Supabase: SQL Editor (or `supabase db push`).
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- Profiles (1 row per auth user) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  first_name  text,
  last_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', nullif(substr(new.raw_user_meta_data ->> 'full_name', strpos(new.raw_user_meta_data ->> 'full_name', ' ') + 1), ''))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Organisations ----------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  sector      text not null,
  size        text not null,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

-- Creates an organisation and its owner membership atomically.
create or replace function public.create_organization(p_name text, p_sector text, p_size text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.organizations (name, sector, size, owner_id)
  values (trim(p_name), p_sector, p_size, auth.uid())
  returning id into org_id;
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, auth.uid(), 'owner');
  return org_id;
end;
$$;

-- ---------- Agents IA subscriptions ----------
create table public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  organization_id             uuid references public.organizations (id) on delete set null,
  plan                        text not null default 'pro',
  cycle                       text not null check (cycle in ('mensuel', 'annuel')),
  extra_users                 integer not null default 0 check (extra_users between 0 and 500),
  options                     text[] not null default '{}',
  monthly_total_cents         integer not null check (monthly_total_cents >= 0),
  status                      text not null default 'pending'
                                check (status in ('pending', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id          text,
  stripe_subscription_id      text unique,
  stripe_checkout_session_id  text unique,
  current_period_end          timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

-- ---------- Video projects (devis / acompte) ----------
create table public.video_projects (
  id                          uuid primary key default gen_random_uuid(),
  reference                   text not null unique,
  user_id                     uuid references public.profiles (id) on delete set null,
  kind                        text not null check (kind in ('devis', 'acompte')),
  status                      text not null default 'nouveau'
                                check (status in ('nouveau', 'acompte_en_attente', 'acompte_paye', 'en_cours', 'termine', 'annule')),
  contact                     jsonb not null,
  items                       jsonb not null,
  total_cents                 integer not null check (total_cents >= 0),
  deposit_cents               integer not null default 0 check (deposit_cents >= 0),
  stripe_checkout_session_id  text unique,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index video_projects_user_idx on public.video_projects (user_id, created_at desc);

-- ---------- Payments ledger (written by the Stripe webhook) ----------
create table public.payments (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references public.profiles (id) on delete set null,
  kind                   text not null check (kind in ('subscription', 'deposit')),
  subscription_id        uuid references public.subscriptions (id) on delete set null,
  project_id             uuid references public.video_projects (id) on delete set null,
  amount_cents           integer not null,
  currency               text not null default 'eur',
  status                 text not null,
  stripe_event_id        text unique,
  stripe_object_id       text,
  created_at             timestamptz not null default now()
);

-- ---------- Site settings (video services pricing edited in admin.html) ----------
create table public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
create trigger video_projects_touch before update on public.video_projects
  for each row execute function public.touch_updated_at();

-- =========================================================
-- Row Level Security
-- Writes that must not be user-controlled (payment status, project intake)
-- go through the service-role key on the server and bypass RLS.
-- =========================================================
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.video_projects       enable row level security;
alter table public.payments             enable row level security;
alter table public.site_settings        enable row level security;

create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
-- Users may edit their names but never their role.
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "organizations: members read" on public.organizations
  for select using (public.is_org_member(id) or public.is_admin());
create policy "organizations: owner updates" on public.organizations
  for update using (owner_id = auth.uid());

create policy "members: read own organisations" on public.organization_members
  for select using (user_id = auth.uid() or public.is_org_member(organization_id) or public.is_admin());

create policy "subscriptions: read own" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

create policy "video_projects: read own" on public.video_projects
  for select using (user_id = auth.uid() or public.is_admin());
create policy "video_projects: admin updates" on public.video_projects
  for update using (public.is_admin());

create policy "payments: read own" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

create policy "site_settings: public read" on public.site_settings
  for select using (true);
create policy "site_settings: admin insert" on public.site_settings
  for insert with check (public.is_admin());
create policy "site_settings: admin update" on public.site_settings
  for update using (public.is_admin());

grant execute on function public.create_organization(text, text, text) to authenticated;
