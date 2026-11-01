-- Lets admins reset the video prices to the defaults of config/services-data.js
-- ("Réinitialiser" button on /admin.html).
create policy "site_settings: admin delete" on public.site_settings
  for delete using (public.is_admin());
