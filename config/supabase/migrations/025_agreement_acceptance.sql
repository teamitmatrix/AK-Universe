-- Privacy-policy acceptance, stored next to the terms acceptance, plus a snapshot of each document
-- so the client portal can serve the exact text that was accepted.

alter table public.subscriptions
  add column if not exists privacy_accepted boolean,
  add column if not exists privacy_version text,
  add column if not exists privacy_label text,
  add column if not exists privacy_accepted_at timestamptz;

alter table public.terms_acceptances
  add column if not exists privacy_version text,
  add column if not exists privacy_label text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists terms_snapshot text,
  add column if not exists privacy_snapshot text;

alter table public.terms_acceptances drop constraint if exists terms_acceptances_kind_check;
alter table public.terms_acceptances
  add constraint terms_acceptances_kind_check
  check (kind in ('subscription', 'project_deposit', 'plan_change'));
