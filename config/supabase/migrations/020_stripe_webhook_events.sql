-- =========================================================
-- AK UNIVERSE — Stripe webhook de-duplication for events that write no payment row
-- Stripe may deliver an event more than once. Events that record a payment are already de-duplicated by
-- payments.stripe_event_id; this table covers the others that have a side effect (customer e-mail on
-- invoice.payment_failed). Server only (service role): RLS on, no policy.
-- =========================================================

create table if not exists public.stripe_webhook_events (
  id           text primary key,
  type         text not null,
  received_at  timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
