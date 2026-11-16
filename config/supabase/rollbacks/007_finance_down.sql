-- Rollback of 007_finance.sql.
-- Refuses (error, nothing changed) if admins already recorded balances: delete or keep them knowingly first.
do $$
begin
  if exists (select 1 from public.payments where kind = 'balance') then
    raise exception 'payments contains kind = balance rows: review them before rolling back 007';
  end if;
end $$;

drop index if exists public.commissions_project_unique;
drop policy if exists "payments: admin insert" on public.payments;
alter table public.payments drop constraint if exists payments_kind_check;
alter table public.payments add constraint payments_kind_check check (kind in ('subscription', 'deposit'));
