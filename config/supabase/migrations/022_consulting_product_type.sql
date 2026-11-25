-- =========================================================
-- AK UNIVERSE — Add "consulting" product type for devis / factures
-- Requires 012 (commission_rates).
-- =========================================================

insert into public.commission_rates (product_type, rate) values
  ('consulting', 12)
on conflict (product_type) do nothing;
