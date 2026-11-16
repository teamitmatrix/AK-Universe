-- =========================================================
-- AK UNIVERSE — Agenda tasks & document storage (admin space)
-- Requires 005_admin_space.sql.
-- =========================================================

-- ---------- Tasks: ONE shared table for everyone ----------
-- A task created by an admin for a sales rep / videographer is the same row the assignee sees in
-- their own space (/equipe): nothing is copied into a separate "admin tasks" list.
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  assigned_to  uuid not null references public.profiles (id) on delete cascade,
  assigned_by  uuid references public.profiles (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 160),
  notes        text check (char_length(notes) <= 2000),
  type         text not null default 'tache'
                 check (type in ('appel', 'rdv', 'relance', 'reunion', 'tournage', 'montage', 'livraison', 'tache')),
  due_at       timestamptz not null,
  project_id   uuid references public.video_projects (id) on delete set null,
  status       text not null default 'a_faire' check (status in ('a_faire', 'fait')),
  done_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on public.tasks (assigned_to, due_at);
create index if not exists tasks_due_idx on public.tasks (due_at);

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;

create policy "tasks: assignee or admin read" on public.tasks
  for select using (assigned_to = auth.uid() or public.is_admin());
create policy "tasks: admin insert" on public.tasks
  for insert with check (public.is_admin());
create policy "tasks: admin update" on public.tasks
  for update using (public.is_admin());
create policy "tasks: admin delete" on public.tasks
  for delete using (public.is_admin());

-- Assignees may only tick their own task done / not done (no other column), through this function.
create or replace function public.set_task_done(p_task uuid, p_done boolean)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.tasks
     set status = case when p_done then 'fait' else 'a_faire' end,
         done_at = case when p_done then now() else null end
   where id = p_task
     and (assigned_to = auth.uid() or public.is_admin())
     and exists (select 1 from public.profiles where id = auth.uid() and active);
  return found;
end;
$$;
grant execute on function public.set_task_done(uuid, boolean) to authenticated;

-- ---------- Documents: one private bucket ----------
-- library/<category>/<file>   shared resource library (brochures, CGV, contracts…)
-- projects/<project id>/<file> files of a video project (rushes, music, visuals…)
-- Quotes & invoices are NOT stored here: they are read from video_projects / payments.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do nothing;

create policy "documents: admin read" on storage.objects
  for select using (bucket_id = 'documents' and public.is_admin());
create policy "documents: admin insert" on storage.objects
  for insert with check (bucket_id = 'documents' and public.is_admin());
create policy "documents: admin update" on storage.objects
  for update using (bucket_id = 'documents' and public.is_admin());
create policy "documents: admin delete" on storage.objects
  for delete using (bucket_id = 'documents' and public.is_admin());
-- Staff read the files of the projects assigned to them, and the shared library.
create policy "documents: staff read" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('commercial', 'videaste') and p.active)
    and (
      split_part(name, '/', 1) = 'library'
      or exists (
        select 1 from public.video_projects v
        where v.id::text = split_part(name, '/', 2)
          and (v.videaste_id = auth.uid() or v.commercial_id = auth.uid())
      )
    )
  );
