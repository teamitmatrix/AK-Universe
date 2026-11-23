-- =========================================================
-- AK UNIVERSE — Client space "Mon compte"
-- Requires 001 (profiles, touch_updated_at) and 005 (profiles.active).
--   * profiles: company / contact details and notification preferences of a customer. Customers update their own
--     row through the existing "profiles: update own" policy (role and active flag stay locked).
--   * account_email_changes: pending e-mail change — the 6-digit code sent to the NEW address, stored only as an
--     HMAC, with an expiry and an attempt counter. Server only (service role): no policy, customers cannot read it.
-- =========================================================

alter table public.profiles
  add column if not exists phone text check (phone is null or char_length(phone) <= 40),
  add column if not exists company_name text check (company_name is null or char_length(company_name) <= 120),
  add column if not exists address_line1 text check (address_line1 is null or char_length(address_line1) <= 160),
  add column if not exists address_line2 text check (address_line2 is null or char_length(address_line2) <= 160),
  add column if not exists postal_code text check (postal_code is null or char_length(postal_code) <= 20),
  add column if not exists city text check (city is null or char_length(city) <= 80),
  add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$'),
  add column if not exists notification_prefs jsonb not null default '{"billing": true, "news": false, "subscription": true}'::jsonb;

create table if not exists public.account_email_changes (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  new_email   text not null check (char_length(new_email) <= 254),
  code_hash   text not null,
  attempts    integer not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

alter table public.account_email_changes enable row level security;
