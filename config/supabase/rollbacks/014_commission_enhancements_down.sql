-- Rollback of 014_commission_enhancements.sql
drop function if exists public.ensure_subscription_commission(uuid);
-- Restore the 012 trigger bodies (commission on full "payee" only, no fixed fee / amount_paid).
create or replace function public.sales_documents_compute()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  line jsonb;
  lines jsonb := '[]'::jsonb;
  qty numeric;
  unit integer;
  ptype text;
  r numeric;
  rep_rate numeric;
  ht bigint := 0;
  com numeric := 0;
  y integer;
  n integer;
begin
  if tg_op = 'UPDATE' then
    if old.status in ('payee', 'validee', 'annulee') and not public.is_admin() and auth.uid() is not null then
      raise exception 'document_locked';
    end if;
    if new.salesperson_id is distinct from old.salesperson_id and not public.is_admin() and auth.uid() is not null then
      raise exception 'document_owner_locked';
    end if;
    new.number := old.number;
    new.kind := old.kind;
  end if;
  if tg_op = 'INSERT' then
    y := extract(year from coalesce(new.issue_date, current_date))::integer;
    insert into public.document_counters (kind, year, last) values (new.kind, y, 1)
      on conflict (kind, year) do update set last = public.document_counters.last + 1
      returning last into n;
    new.number := case when new.kind = 'devis' then 'DEV' else 'FAC' end || '-' || y || '-' || lpad(n::text, 4, '0');
  end if;
  select commission_rate into rep_rate from public.profiles where id = new.salesperson_id;
  for line in select * from jsonb_array_elements(new.lines) loop
    qty := (line ->> 'qty')::numeric;
    unit := (line ->> 'unit_cents')::integer;
    ptype := line ->> 'product_type';
    if qty is null or qty <= 0 or qty > 10000 or unit is null or unit < 0 or unit > 100000000
       or coalesce(char_length(line ->> 'label'), 0) not between 1 and 200 then
      raise exception 'invalid_line';
    end if;
    select rate into r from public.commission_rates where product_type = ptype;
    if not found then raise exception 'invalid_product_type'; end if;
    r := coalesce(r, rep_rate, 10);
    ht := ht + round(qty * unit);
    com := com + qty * unit * r / 100;
    lines := lines || jsonb_build_object(
      'catalogue_id', line ->> 'catalogue_id',
      'label', line ->> 'label',
      'detail', left(coalesce(line ->> 'detail', ''), 300),
      'product_type', ptype,
      'qty', qty,
      'unit_cents', unit,
      'rate', r,
      'total_cents', round(qty * unit)
    );
  end loop;
  new.lines := lines;
  new.total_ht_cents := ht;
  new.total_ttc_cents := round(ht * (1 + new.vat_rate / 100));
  new.commission_cents := round(com);
  if new.status = 'payee' and (tg_op = 'INSERT' or old.status <> 'payee') then
    new.paid_at := now();
  elsif new.status <> 'payee' then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.sales_documents_commission()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.kind = 'facture' and new.status = 'payee' and new.salesperson_id is not null
     and (tg_op = 'INSERT' or old.status <> 'payee') then
    insert into public.commissions (commercial_id, document_id, amount_cents, status)
    values (new.salesperson_id, new.id, new.commission_cents, 'en_attente')
    on conflict (document_id) do nothing;
  end if;
  return null;
end;
$$;

delete from public.commissions where payment_id is not null;
drop index if exists public.commissions_payment_key;
alter table public.commissions drop column if exists payment_id;
drop policy if exists "subscriptions: admin update commercial" on public.subscriptions;
drop index if exists public.subscriptions_commercial_idx;
alter table public.subscriptions drop column if exists commercial_id;
alter table public.sales_documents drop column if exists amount_paid_cents;
