-- Rollback of 011_prospects.sql (deletes every prospect, its history and every customer record).
drop function if exists public.convert_prospect(uuid);
drop table if exists public.prospect_events;
alter table if exists public.customers drop constraint if exists customers_source_prospect_fkey;
drop table if exists public.prospects;
drop table if exists public.customers;
drop function if exists public.prospects_log();
drop function if exists public.prospects_guard();
drop function if exists public.is_active_commercial();
