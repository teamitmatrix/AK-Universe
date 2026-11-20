-- =========================================================
-- AK UNIVERSE — Public share link for commercial devis / factures
-- Clients open /d/<share_token> to view and download (print-to-PDF).
-- =========================================================

alter table public.sales_documents
  add column if not exists share_token text;

create unique index if not exists sales_documents_share_token_key
  on public.sales_documents (share_token)
  where share_token is not null;
