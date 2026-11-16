-- Rollback of 009_audit_log.sql (deletes the audit history).
drop table if exists public.audit_log;
