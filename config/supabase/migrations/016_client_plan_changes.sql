-- =========================================================
-- AK UNIVERSE — Client space "Mon offre": plan / option changes and cancellation
-- Requires 001 (subscriptions). Written only by the server (service role) after the customer's session and the
-- Stripe call are verified; customers keep read-only access through "subscriptions: read own".
--   * plan_price_cents        — base monthly price (excl. VAT, before the annual discount) locked when the plan was
--                               bought / changed, so a catalogue price change never re-prices a running subscription.
--                               null = subscribed on /abonnement before 016 → the configured AK Universe Pro price.
--   * cancel_at_period_end    — cancellation scheduled: access stays until current_period_end, no renewal.
--   * pending_*               — a change waiting for the next renewal (downgrade / lower total) or for the payment
--                               of its prorated invoice; applied by the Stripe webhook (or on read once due).
--   * change_lock_until       — short lock so two submissions can never change the same subscription at once.
-- =========================================================

alter table public.subscriptions
  add column if not exists plan_price_cents integer check (plan_price_cents is null or plan_price_cents >= 0),
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists pending_plan text,
  add column if not exists pending_options text[],
  add column if not exists pending_plan_price_cents integer check (pending_plan_price_cents is null or pending_plan_price_cents >= 0),
  add column if not exists pending_monthly_total_cents integer check (pending_monthly_total_cents is null or pending_monthly_total_cents >= 0),
  add column if not exists pending_kind text check (pending_kind is null or pending_kind in ('renewal', 'payment')),
  add column if not exists pending_effective_at timestamptz,
  add column if not exists pending_invoice_id text,
  add column if not exists change_lock_until timestamptz;
