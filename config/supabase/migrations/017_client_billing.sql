-- =========================================================
-- AK UNIVERSE — Client space "Facturation"
-- Requires 001 (profiles, subscriptions, touch_updated_at, is_admin) and 016 (pending_* columns).
--   * subscriptions.pending_cycle — billing cycle of a change waiting for the payment of its prorated invoice
--                                   (monthly ↔ annual switch).
--   * billing_profiles           — billing name, company, address, country, tax id and billing e-mail of a customer.
--                                   Customers read their own row; writes go through the server (service role) after
--                                   the session is verified, and are mirrored to the Stripe customer. No card data:
--                                   payment methods live in Stripe only.
-- =========================================================

alter table public.subscriptions
  add column if not exists pending_cycle text check (pending_cycle is null or pending_cycle in ('mensuel', 'annuel'));

create table if not exists public.billing_profiles (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  full_name      text check (full_name is null or char_length(full_name) <= 120),
  company        text check (company is null or char_length(company) <= 120),
  address_line1  text check (address_line1 is null or char_length(address_line1) <= 160),
  address_line2  text check (address_line2 is null or char_length(address_line2) <= 160),
  postal_code    text check (postal_code is null or char_length(postal_code) <= 20),
  city           text check (city is null or char_length(city) <= 80),
  country        text check (country is null or country ~ '^[A-Z]{2}$'),
  tax_id         text check (tax_id is null or char_length(tax_id) <= 32),
  email          text check (email is null or char_length(email) <= 254),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists billing_profiles_touch on public.billing_profiles;
create trigger billing_profiles_touch before update on public.billing_profiles
  for each row execute function public.touch_updated_at();

alter table public.billing_profiles enable row level security;

drop policy if exists "billing_profiles: read own" on public.billing_profiles;
create policy "billing_profiles: read own" on public.billing_profiles
  for select using (user_id = auth.uid() or public.is_admin());
