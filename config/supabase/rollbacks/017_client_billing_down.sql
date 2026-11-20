-- Rollback of 017_client_billing.sql.
drop table if exists public.billing_profiles;
alter table public.subscriptions drop column if exists pending_cycle;
