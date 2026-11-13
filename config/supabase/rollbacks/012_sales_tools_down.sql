-- Rollback of 012_sales_tools.sql (deletes quotes / invoices, agenda events, rep-created tasks' new columns,
-- invoice commissions and the commission rates).
drop policy if exists "tasks: rep creates own" on public.tasks;
drop policy if exists "tasks: rep updates own" on public.tasks;
drop policy if exists "tasks: rep deletes own" on public.tasks;
delete from public.tasks where assigned_by = assigned_to;
alter table public.tasks drop column if exists priority, drop column if exists client_name;
drop table if exists public.agenda_events;
delete from public.commissions where document_id is not null;
drop index if exists public.commissions_document_key;
alter table public.commissions drop column if exists document_id;
drop table if exists public.sales_documents;
drop function if exists public.sales_documents_commission();
drop function if exists public.sales_documents_compute();
drop table if exists public.document_counters;
drop table if exists public.commission_rates;
