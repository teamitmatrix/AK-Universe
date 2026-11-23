-- Rollback of 016_client_plan_changes.sql.
alter table public.subscriptions
  drop column if exists plan_price_cents,
  drop column if exists cancel_at_period_end,
  drop column if exists canceled_at,
  drop column if exists pending_plan,
  drop column if exists pending_options,
  drop column if exists pending_plan_price_cents,
  drop column if exists pending_monthly_total_cents,
  drop column if exists pending_kind,
  drop column if exists pending_effective_at,
  drop column if exists pending_invoice_id,
  drop column if exists change_lock_until;
