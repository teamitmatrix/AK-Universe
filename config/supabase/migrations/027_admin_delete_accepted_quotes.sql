-- Admins may delete accepted quotes (devis / validee) as well as drafts.
-- Sales reps can still delete only their own drafts.

drop policy if exists "sales_documents: rep deletes own drafts" on public.sales_documents;
create policy "sales_documents: rep deletes own drafts" on public.sales_documents
  for delete using (
    (salesperson_id = auth.uid() and public.is_active_commercial() and status = 'brouillon')
    or (public.is_admin() and (status = 'brouillon' or (kind = 'devis' and status = 'validee')))
  );
