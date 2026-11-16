-- Rollback of 008_tasks_documents.sql (deletes all tasks).
-- Supabase forbids deleting storage rows in SQL (storage.protect_delete): the empty "documents" bucket is removed
-- afterwards through the Storage API by scripts/db/migrate-step.mjs (only when it holds no file).
drop policy if exists "documents: admin read" on storage.objects;
drop policy if exists "documents: admin insert" on storage.objects;
drop policy if exists "documents: admin update" on storage.objects;
drop policy if exists "documents: admin delete" on storage.objects;
drop policy if exists "documents: staff read" on storage.objects;

drop function if exists public.set_task_done(uuid, boolean);
drop table if exists public.tasks;
