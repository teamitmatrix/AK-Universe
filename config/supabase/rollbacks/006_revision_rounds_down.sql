-- Rollback of 006_revision_rounds.sql (deletes the revision counts).
alter table public.video_projects drop column if exists revision_rounds;
