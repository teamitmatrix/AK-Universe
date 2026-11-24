-- Rollback 021_terms_acceptance.sql
drop policy if exists "terms_acceptances: read own" on public.terms_acceptances;
drop table if exists public.terms_acceptances;
alter table public.subscriptions
  drop column if exists terms_accepted,
  drop column if exists terms_version,
  drop column if exists terms_label,
  drop column if exists terms_accepted_at;
