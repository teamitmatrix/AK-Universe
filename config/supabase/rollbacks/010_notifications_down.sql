-- Rollback of 010_notifications.sql (deletes every notification).
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end;
$$;
drop function if exists public.mark_notifications_read(uuid[]);
drop table if exists public.notifications;
