-- =========================================================
-- Persist site universe on video_projects so admin sales /
-- reports / commissions classify Agents IA · Marketing · Digital.
-- Backfill from priced line labels (items[].service).
-- =========================================================

alter table public.video_projects
  add column if not exists universe text
  check (universe is null or universe in ('agents', 'marketing', 'digital'));

create index if not exists video_projects_universe_idx on public.video_projects (universe);

-- Agents IA (Agent IA — … / Add-on — …)
update public.video_projects
   set universe = 'agents'
 where universe is null
   and exists (
     select 1
       from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e
      where coalesce(e->>'service', '') ilike 'Agent IA%'
         or coalesce(e->>'service', '') ilike 'Add-on%'
   );

-- Marketing forfaits
update public.video_projects
   set universe = 'marketing'
 where universe is null
   and exists (
     select 1
       from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e
      where coalesce(e->>'service', '') ~* '^Forfait\b'
   );

-- Digital websites (published catalogue names)
update public.video_projects
   set universe = 'digital'
 where universe is null
   and exists (
     select 1
       from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e
      where lower(trim(coalesce(e->>'service', ''))) in (
        'site vitrine',
        'site restaurant + commande',
        'site e-commerce',
        'landing page'
      )
   );

-- Remaining paid / open video requests → Marketing (video services)
update public.video_projects
   set universe = 'marketing'
 where universe is null;
