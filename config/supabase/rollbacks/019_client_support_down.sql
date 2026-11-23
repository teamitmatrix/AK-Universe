-- Rollback of 019_client_support.sql.
drop table if exists public.support_messages;
drop table if exists public.support_tickets;
drop sequence if exists public.support_ticket_seq;
