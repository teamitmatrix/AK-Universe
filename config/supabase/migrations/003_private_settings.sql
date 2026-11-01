-- Settings only admins may read (site_settings is public). First use: the chatbot
-- knowledge edited on /admin.html?vue=chatbot, read by /api/chat with the service role.
create table public.private_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

create trigger private_settings_touch before update on public.private_settings
  for each row execute function public.touch_updated_at();

alter table public.private_settings enable row level security;

create policy "private_settings: admin read" on public.private_settings
  for select using (public.is_admin());
create policy "private_settings: admin insert" on public.private_settings
  for insert with check (public.is_admin());
create policy "private_settings: admin update" on public.private_settings
  for update using (public.is_admin());
create policy "private_settings: admin delete" on public.private_settings
  for delete using (public.is_admin());
