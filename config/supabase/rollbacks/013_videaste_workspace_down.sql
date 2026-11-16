-- Rollback of 013_videaste_workspace.sql (restores the schema of 012).
-- Lost: stages, briefs, file links, versions, client feedback, task start times, phone / specialties,
-- videographers' agenda events and notifications of the two new types.

-- Notifications: back to the 010 types.
delete from public.notifications where type in ('project_assigned', 'version_reviewed');
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'lead_assigned', 'quote_accepted', 'invoice_paid', 'commission_validated', 'commission_paid', 'task_assigned', 'reminder_due'));

alter table public.profiles drop column if exists specialties, drop column if exists phone;

drop function if exists public.set_task_progress(uuid, text);
alter table public.tasks drop column if exists started_at;

-- Agenda: videographers' events go, the 012 types and policies come back.
drop policy if exists "agenda_events: videaste reads own" on public.agenda_events;
drop policy if exists "agenda_events: videaste creates own" on public.agenda_events;
drop policy if exists "agenda_events: videaste updates own" on public.agenda_events;
drop policy if exists "agenda_events: videaste deletes own" on public.agenda_events;
delete from public.agenda_events where type in ('tournage', 'reunion', 'deadline', 'revue', 'livraison');
alter table public.agenda_events drop constraint if exists agenda_events_type_check;
alter table public.agenda_events add constraint agenda_events_type_check check (type in ('appel', 'rdv', 'rappel', 'visite'));
drop index if exists public.agenda_events_project_idx;
alter table public.agenda_events drop column if exists project_id;

drop function if exists public.set_feedback_status(uuid, text);
drop function if exists public.respond_to_version(uuid, text, text);
drop function if exists public.send_version_for_validation(uuid);
drop table if exists public.client_feedback;
drop table if exists public.project_versions;
drop function if exists public.project_versions_number();
drop table if exists public.project_files;
drop table if exists public.project_briefs;
drop function if exists public.is_storage_link(text);

drop function if exists public.set_project_stage(uuid, text);
drop function if exists public.apply_project_stage(uuid, text);
drop trigger if exists video_projects_stage_stamp on public.video_projects;
drop function if exists public.video_projects_stage_stamp();
drop index if exists public.video_projects_videaste_stage_idx;
alter table public.video_projects drop column if exists stage_changed_at, drop column if exists stage;

-- Back to the 005 policy (no active check), before dropping is_active_videaste().
drop policy if exists "video_projects: staff read assigned" on public.video_projects;
create policy "video_projects: staff read assigned" on public.video_projects
  for select using (commercial_id = auth.uid() or videaste_id = auth.uid());

drop function if exists public.is_project_videaste(uuid);
drop function if exists public.is_active_videaste();
