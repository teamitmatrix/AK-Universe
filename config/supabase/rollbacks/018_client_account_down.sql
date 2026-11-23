-- Rollback of 018_client_account.sql (phone is kept: it also belongs to 013).
drop table if exists public.account_email_changes;
alter table public.profiles
  drop column if exists company_name,
  drop column if exists address_line1,
  drop column if exists address_line2,
  drop column if exists postal_code,
  drop column if exists city,
  drop column if exists country,
  drop column if exists notification_prefs;
