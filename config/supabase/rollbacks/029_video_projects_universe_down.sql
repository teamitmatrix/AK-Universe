drop index if exists public.video_projects_universe_idx;
alter table public.video_projects drop column if exists universe;
