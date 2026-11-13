-- =========================================================
-- AK UNIVERSE — Sales ledger & commissions (admin space)
-- Requires 005_admin_space.sql.
--   * payments.kind 'balance': the remaining amount of a video project, recorded by an admin
--     once it is collected (bank transfer, cheque…) — Stripe only records the deposit.
--   * one commission per sale at most (generation from /admin/commissions is idempotent).
-- =========================================================

alter table public.payments drop constraint if exists payments_kind_check;
alter table public.payments
  add constraint payments_kind_check check (kind in ('subscription', 'deposit', 'balance'));

-- Admins record collected balances; Stripe payments keep going through the webhook (service role).
create policy "payments: admin insert" on public.payments
  for insert with check (public.is_admin() and kind = 'balance');

-- Plain (not partial) so ON CONFLICT (project_id) can use it; NULLs never conflict with each other.
create unique index if not exists commissions_project_unique on public.commissions (project_id);
