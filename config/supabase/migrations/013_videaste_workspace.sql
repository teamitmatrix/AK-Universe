-- =========================================================
-- AK UNIVERSE — Videographer workspace (Espace Vidéaste handoff, pages 02–11)
-- Requires 005 (videaste role, video_projects.videaste_id / deadline), 006 (revision_rounds), 008 + 012 (tasks,
-- agenda_events) and 010 (notifications).
--   * is_active_videaste() / is_project_videaste()   RLS helpers (same pattern as is_active_commercial(), 011)
--   * video_projects.stage       production workflow (page 04), separate from `status` (commercial / payment state):
--                                brief_recu → tournage → montage → a_valider → modifications → valide → livre
--   * set_project_stage()        the ONLY way a videographer changes a stage: transition re-validated here
--   * project_briefs             structured client brief + technical spec (one row per project)
--   * project_files              LINKS to the project's existing external storage (Drive, Dropbox, WeTransfer,
--                                Frame.io, OneDrive) — nothing is uploaded or hosted by AK Universe
--   * project_versions           video versions; send_version_for_validation() (videographer) and
--                                respond_to_version() (ADMIN ONLY — never the videographer's own session)
--   * client_feedback            requested modifications, with their handling status (set_feedback_status())
--   * agenda_events              the existing agenda table now also holds videographers' events (owner column
--                                salesperson_id = the owner), with shoot / deadline / review / delivery types
--   * tasks.started_at           "En cours" on a task without a new status value (status stays a_faire / fait)
--   * profiles.phone / specialties   edited by an admin (and by the person on their own profile)
--   * notifications              two new types for videographers: project_assigned, version_reviewed
-- A videographer only ever reads / writes rows of the projects assigned to them, while their account is active.
-- =========================================================

-- ---------- RLS helpers ----------
create or replace function public.is_active_videaste()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'videaste' and active);
$$;
grant execute on function public.is_active_videaste() to authenticated;

-- The caller is the active videographer assigned to this project.
create or replace function public.is_project_videaste(p_project uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.video_projects v
      join public.profiles p on p.id = v.videaste_id
     where v.id = p_project and v.videaste_id = auth.uid() and p.role = 'videaste' and p.active
  );
$$;
grant execute on function public.is_project_videaste(uuid) to authenticated;

-- ---------- Assigned projects: readable only while the staff account is ACTIVE ----------
-- 005 let an assigned sales rep / videographer read a project even after deactivation (the pages already refuse
-- them; this closes the direct-API path too — handoff page 03: "block access immediately if deactivated").
drop policy if exists "video_projects: staff read assigned" on public.video_projects;
create policy "video_projects: staff read assigned" on public.video_projects
  for select using (
    (commercial_id = auth.uid() and public.is_active_commercial())
    or (videaste_id = auth.uid() and public.is_active_videaste())
  );

-- ---------- Production stage on the existing video_projects table ----------
alter table public.video_projects
  add column if not exists stage text
    check (stage in ('brief_recu', 'tournage', 'montage', 'a_valider', 'modifications', 'valide', 'livre')),
  add column if not exists stage_changed_at timestamptz;

create index if not exists video_projects_videaste_stage_idx on public.video_projects (videaste_id, stage);

-- Starting point for existing rows, from the commercial status (the videographer / admin corrects it later):
-- not started yet → brief reçu · in progress → montage · finished → livré. Cancelled projects get no stage.
-- updated_at is left untouched (the touch trigger is paused for this one statement only).
alter table public.video_projects disable trigger video_projects_touch;
update public.video_projects
   set stage = case
                 when status in ('nouveau', 'acompte_en_attente', 'acompte_paye') then 'brief_recu'
                 when status = 'en_cours' then 'montage'
                 when status = 'termine' then 'livre'
               end,
       stage_changed_at = case when status = 'termine' then updated_at else null end
 where stage is null and status <> 'annule';
alter table public.video_projects enable trigger video_projects_touch;

create or replace function public.video_projects_stage_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.stage is null and new.status <> 'annule' then new.stage := 'brief_recu'; end if;
    if new.stage is not null then new.stage_changed_at := now(); end if;
  elsif new.stage is distinct from old.stage then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists video_projects_stage_stamp on public.video_projects;
create trigger video_projects_stage_stamp before insert or update of stage on public.video_projects
  for each row execute function public.video_projects_stage_stamp();

-- Internal: moves a project to a stage and keeps the commercial status consistent for PAID projects only
-- (work started → en_cours, delivered → termine). Unpaid requests keep their status. Not callable by clients.
create or replace function public.apply_project_stage(p_project uuid, p_stage text)
returns void
language sql
security definer set search_path = ''
as $$
  update public.video_projects
     set stage = p_stage,
         status = case
                    when p_stage = 'livre' and status in ('acompte_paye', 'en_cours') then 'termine'
                    when p_stage in ('tournage', 'montage', 'a_valider', 'modifications', 'valide') and status = 'acompte_paye' then 'en_cours'
                    else status
                  end
   where id = p_project;
$$;
revoke all on function public.apply_project_stage(uuid, text) from public, anon, authenticated;

-- Stage change from the videographer's dropdown (or an admin). Re-validated here, whatever the browser sends:
--   videographer: brief reçu / tournage / montage at any time before delivery; livré only once validated.
--                 "À faire valider" comes from sending a version, "Validé" / "Modifications" only from the
--                 client / admin response — never from the videographer's own session.
--   admin:        any stage.
create or replace function public.set_project_stage(p_project uuid, p_stage text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  cur text;
begin
  if p_stage not in ('brief_recu', 'tournage', 'montage', 'a_valider', 'modifications', 'valide', 'livre') then
    raise exception 'invalid stage %', p_stage using errcode = '22023';
  end if;
  select stage into cur from public.video_projects where id = p_project;
  if not found then return false; end if;

  if public.is_admin() then
    perform public.apply_project_stage(p_project, p_stage);
    return true;
  end if;
  if not public.is_project_videaste(p_project) then return false; end if;
  if cur = 'livre'
     or p_stage in ('a_valider', 'modifications', 'valide')
     or (p_stage = 'livre' and cur is distinct from 'valide') then
    raise exception 'transition_refused' using errcode = 'P0001';
  end if;
  perform public.apply_project_stage(p_project, p_stage);
  return true;
end;
$$;
revoke all on function public.set_project_stage(uuid, text) from public;
grant execute on function public.set_project_stage(uuid, text) to authenticated;

-- ---------- Structured client brief + technical spec ----------
create table if not exists public.project_briefs (
  project_id        uuid primary key references public.video_projects (id) on delete cascade,
  objective         text check (char_length(objective) <= 1000),
  main_message      text check (char_length(main_message) <= 1000),
  audience          text check (char_length(audience) <= 500),
  style             text check (char_length(style) <= 500),
  style_references  text check (char_length(style_references) <= 1000),
  call_to_action    text check (char_length(call_to_action) <= 300),
  extra_notes       text check (char_length(extra_notes) <= 2000),
  video_type        text check (char_length(video_type) <= 80),
  duration          text check (char_length(duration) <= 40),
  format            text check (char_length(format) <= 40),
  resolution        text check (char_length(resolution) <= 40),
  video_count       integer check (video_count between 1 and 100),
  platform          text check (char_length(platform) <= 80),
  updated_by        uuid references public.profiles (id) on delete set null,
  updated_at        timestamptz not null default now()
);
create trigger project_briefs_touch before update on public.project_briefs
  for each row execute function public.touch_updated_at();
alter table public.project_briefs enable row level security;
create policy "project_briefs: assigned videaste or admin read" on public.project_briefs
  for select using (public.is_admin() or public.is_project_videaste(project_id));
create policy "project_briefs: assigned videaste or admin insert" on public.project_briefs
  for insert with check ((public.is_admin() or public.is_project_videaste(project_id)) and updated_by = auth.uid());
create policy "project_briefs: assigned videaste or admin update" on public.project_briefs
  for update using (public.is_admin() or public.is_project_videaste(project_id))
  with check ((public.is_admin() or public.is_project_videaste(project_id)) and updated_by = auth.uid());

-- ---------- Links to the project's existing external storage ----------
-- Only https links on the five supported providers' own domains are stored (checked here AND in the server code).
create or replace function public.is_storage_link(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(p_url) <= 2000
     and p_url ~* '^https://([a-z0-9-]+\.)*(google\.com|dropbox\.com|db\.tt|wetransfer\.com|we\.tl|frame\.io|f\.io|live\.com|1drv\.ms|sharepoint\.com|onedrive\.com)(:[0-9]+)?(/[^\s]*)?$';
$$;

create table if not exists public.project_files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.video_projects (id) on delete cascade,
  category      text not null check (category in ('rushs', 'musique', 'logos', 'images', 'documents', 'exports', 'versions_finales')),
  name          text not null check (char_length(name) between 1 and 160),
  external_url  text not null check (public.is_storage_link(external_url)),
  provider      text not null check (provider in ('google_drive', 'dropbox', 'wetransfer', 'frameio', 'onedrive')),
  added_by      uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists project_files_project_idx on public.project_files (project_id, created_at desc);
alter table public.project_files enable row level security;
create policy "project_files: assigned videaste or admin read" on public.project_files
  for select using (public.is_admin() or public.is_project_videaste(project_id));
create policy "project_files: assigned videaste or admin insert" on public.project_files
  for insert with check ((public.is_admin() or public.is_project_videaste(project_id)) and added_by = auth.uid());
create policy "project_files: own link or admin delete" on public.project_files
  for delete using (public.is_admin() or (public.is_project_videaste(project_id) and added_by = auth.uid()));

-- ---------- Video versions ----------
create table if not exists public.project_versions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.video_projects (id) on delete cascade,
  number          integer not null,
  label           text check (char_length(label) <= 80),
  external_url    text not null check (public.is_storage_link(external_url)),
  provider        text not null check (provider in ('google_drive', 'dropbox', 'wetransfer', 'frameio', 'onedrive')),
  notes           text check (char_length(notes) <= 1000),
  status          text not null default 'brouillon' check (status in ('brouillon', 'envoyee', 'validee', 'modifications')),
  client_comment  text check (char_length(client_comment) <= 2000),
  author_id       uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  responded_at    timestamptz,
  responded_by    uuid references public.profiles (id) on delete set null,
  unique (project_id, number)
);

-- V1, V2… numbered by the database (never by the browser).
create or replace function public.project_versions_number()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('project_versions:' || new.project_id::text));
  select coalesce(max(number), 0) + 1 into new.number from public.project_versions where project_id = new.project_id;
  return new;
end;
$$;
drop trigger if exists project_versions_number on public.project_versions;
create trigger project_versions_number before insert on public.project_versions
  for each row execute function public.project_versions_number();

alter table public.project_versions enable row level security;
create policy "project_versions: assigned videaste or admin read" on public.project_versions
  for select using (public.is_admin() or public.is_project_videaste(project_id));
-- A videographer adds a draft only; sending and the response go through the functions below.
create policy "project_versions: assigned videaste or admin insert" on public.project_versions
  for insert with check (
    (public.is_admin() or public.is_project_videaste(project_id))
    and author_id = auth.uid() and status = 'brouillon' and sent_at is null and responded_at is null and client_comment is null
  );
create policy "project_versions: own draft or admin delete" on public.project_versions
  for delete using (public.is_admin() or (public.is_project_videaste(project_id) and author_id = auth.uid() and status = 'brouillon'));

-- ---------- Client feedback (requested modifications) ----------
create table if not exists public.client_feedback (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.video_projects (id) on delete cascade,
  version_id  uuid references public.project_versions (id) on delete set null,
  comment     text not null check (char_length(comment) between 1 and 2000),
  status      text not null default 'a_traiter' check (status in ('a_traiter', 'en_cours', 'corrige')),
  deadline    date,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists client_feedback_project_idx on public.client_feedback (project_id, created_at desc);
create trigger client_feedback_touch before update on public.client_feedback
  for each row execute function public.touch_updated_at();
alter table public.client_feedback enable row level security;
create policy "client_feedback: assigned videaste or admin read" on public.client_feedback
  for select using (public.is_admin() or public.is_project_videaste(project_id));
create policy "client_feedback: admin insert" on public.client_feedback
  for insert with check (public.is_admin());
create policy "client_feedback: admin update" on public.client_feedback
  for update using (public.is_admin());
create policy "client_feedback: admin delete" on public.client_feedback
  for delete using (public.is_admin());

-- The videographer sends a draft version for validation → version "envoyée", project "À faire valider".
create or replace function public.send_version_for_validation(p_version uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v record;
begin
  select pv.id, pv.project_id, pv.status, vp.stage into v
    from public.project_versions pv join public.video_projects vp on vp.id = pv.project_id
   where pv.id = p_version;
  if not found or not (public.is_admin() or public.is_project_videaste(v.project_id)) then return null; end if;
  -- One version waits for the client's answer at a time.
  if v.status <> 'brouillon' or v.stage = 'livre'
     or exists (select 1 from public.project_versions where project_id = v.project_id and status = 'envoyee') then
    raise exception 'transition_refused' using errcode = 'P0001';
  end if;
  update public.project_versions set status = 'envoyee', sent_at = now() where id = p_version;
  perform public.apply_project_stage(v.project_id, 'a_valider');
  return v.project_id;
end;
$$;
revoke all on function public.send_version_for_validation(uuid) from public;
grant execute on function public.send_version_for_validation(uuid) to authenticated;

-- The client's answer, recorded by an ADMIN (no client portal yet): validée → project "Validé";
-- modifications → project "Modifications", +1 revision round and a client_feedback row to handle.
create or replace function public.respond_to_version(p_version uuid, p_decision text, p_comment text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v record;
  clean text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if not public.is_admin() then return null; end if;
  if p_decision not in ('validee', 'modifications') then
    raise exception 'invalid decision %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'modifications' and clean is null then
    raise exception 'comment_required' using errcode = '22023';
  end if;
  select pv.id, pv.project_id, pv.status, vp.videaste_id into v
    from public.project_versions pv join public.video_projects vp on vp.id = pv.project_id
   where pv.id = p_version;
  if not found then return null; end if;
  if v.status <> 'envoyee' then
    raise exception 'transition_refused' using errcode = 'P0001';
  end if;
  update public.project_versions
     set status = p_decision, client_comment = left(clean, 2000), responded_at = now(), responded_by = auth.uid()
   where id = p_version;
  if p_decision = 'validee' then
    perform public.apply_project_stage(v.project_id, 'valide');
  else
    perform public.apply_project_stage(v.project_id, 'modifications');
    update public.video_projects set revision_rounds = least(revision_rounds + 1, 50) where id = v.project_id;
    insert into public.client_feedback (project_id, version_id, comment, created_by)
    values (v.project_id, p_version, left(clean, 2000), auth.uid());
  end if;
  return v.project_id;
end;
$$;
revoke all on function public.respond_to_version(uuid, text, text) from public;
grant execute on function public.respond_to_version(uuid, text, text) to authenticated;

-- Handling status of a feedback (À traiter / En cours / Corrigé): the assigned videographer or an admin.
create or replace function public.set_feedback_status(p_feedback uuid, p_status text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_status not in ('a_traiter', 'en_cours', 'corrige') then
    raise exception 'invalid feedback status %', p_status using errcode = '22023';
  end if;
  update public.client_feedback f
     set status = p_status
   where f.id = p_feedback
     and (public.is_admin() or public.is_project_videaste(f.project_id));
  return found;
end;
$$;
revoke all on function public.set_feedback_status(uuid, text) from public;
grant execute on function public.set_feedback_status(uuid, text) to authenticated;

-- ---------- Agenda: the existing agenda_events table, for videographers too ----------
-- salesperson_id is the owner of the event (a sales rep or a videographer).
alter table public.agenda_events
  add column if not exists project_id uuid references public.video_projects (id) on delete set null;
create index if not exists agenda_events_project_idx on public.agenda_events (project_id);
alter table public.agenda_events drop constraint if exists agenda_events_type_check;
alter table public.agenda_events add constraint agenda_events_type_check
  check (type in ('appel', 'rdv', 'rappel', 'visite', 'tournage', 'reunion', 'deadline', 'revue', 'livraison'));

create policy "agenda_events: videaste reads own" on public.agenda_events
  for select using (salesperson_id = auth.uid() and public.is_active_videaste());
create policy "agenda_events: videaste creates own" on public.agenda_events
  for insert with check (salesperson_id = auth.uid() and public.is_active_videaste() and (project_id is null or public.is_project_videaste(project_id)));
create policy "agenda_events: videaste updates own" on public.agenda_events
  for update using (salesperson_id = auth.uid() and public.is_active_videaste())
  with check (salesperson_id = auth.uid() and public.is_active_videaste() and (project_id is null or public.is_project_videaste(project_id)));
create policy "agenda_events: videaste deletes own" on public.agenda_events
  for delete using (salesperson_id = auth.uid() and public.is_active_videaste());

-- ---------- "En cours" on tasks ----------
alter table public.tasks add column if not exists started_at timestamptz;

-- The assignee (or an admin) moves a task: 'a_faire' | 'en_cours' | 'fait'. Only status / done_at / started_at change.
create or replace function public.set_task_progress(p_task uuid, p_state text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_state not in ('a_faire', 'en_cours', 'fait') then
    raise exception 'invalid task state %', p_state using errcode = '22023';
  end if;
  update public.tasks
     set status     = case when p_state = 'fait' then 'fait' else 'a_faire' end,
         done_at    = case when p_state = 'fait' then coalesce(done_at, now()) else null end,
         started_at = case when p_state = 'a_faire' then null else coalesce(started_at, now()) end
   where id = p_task
     and (assigned_to = auth.uid() or public.is_admin())
     and exists (select 1 from public.profiles where id = auth.uid() and active);
  return found;
end;
$$;
revoke all on function public.set_task_progress(uuid, text) from public;
grant execute on function public.set_task_progress(uuid, text) to authenticated;

-- ---------- Profiles: phone & specialties (videographer roster) ----------
alter table public.profiles
  add column if not exists phone text check (char_length(phone) <= 40),
  add column if not exists specialties text[] not null default '{}' check (cardinality(specialties) <= 12);

-- ---------- Notifications: two new types ----------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'lead_assigned', 'quote_accepted', 'invoice_paid', 'commission_validated', 'commission_paid', 'task_assigned', 'reminder_due',
  'project_assigned', 'version_reviewed'));
