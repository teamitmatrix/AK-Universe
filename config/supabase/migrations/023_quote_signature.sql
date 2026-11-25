-- =========================================================
-- AK UNIVERSE — Electronic signature on shared quotes (/d/<token>)
-- Requires 012 (sales_documents), 016 (share_token).
-- =========================================================

alter table public.sales_documents
  add column if not exists client_signature text,
  add column if not exists signer_name text,
  add column if not exists signed_at timestamptz;

comment on column public.sales_documents.client_signature is
  'PNG data URL of the client e-signature (devis only).';
comment on column public.sales_documents.signer_name is
  'Name typed by the client when signing the devis.';
comment on column public.sales_documents.signed_at is
  'Timestamp of electronic acceptance of the devis.';
