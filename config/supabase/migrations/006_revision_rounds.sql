-- =========================================================
-- AK UNIVERSE — Revision rounds on video projects (admin "Vidéastes" space)
-- Number of client revision rounds requested on a project, set from /admin?vue=demandes.
-- Requires 005_admin_space.sql.
-- =========================================================
alter table public.video_projects
  add column if not exists revision_rounds integer not null default 0 check (revision_rounds between 0 and 50);
