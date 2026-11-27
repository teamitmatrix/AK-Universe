-- Rollback of 026_videaste_rates.sql
drop function if exists public.confirm_rate_item(uuid);
drop table if exists public.videaste_rate_items;
drop table if exists public.videaste_rate_cards;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'lead_assigned', 'quote_accepted', 'invoice_paid',
  'commission_validated', 'commission_paid', 'task_assigned', 'reminder_due',
  'project_assigned', 'version_reviewed'));
