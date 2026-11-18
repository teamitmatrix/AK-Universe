-- Rollback of 015_commercial_line_rates.sql (restores 014 sales_documents_compute body).
alter table public.profiles
  drop column if exists commission_rate_ai,
  drop column if exists commission_rate_marketing,
  drop column if exists commission_rate_digital;

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
  fixed integer;
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
    fixed := null;
    if line ? 'fixed_commission_cents' and coalesce(line ->> 'fixed_commission_cents', '') <> '' then
      begin
        fixed := (line ->> 'fixed_commission_cents')::integer;
      exception when others then
        raise exception 'invalid_fixed_commission';
      end;
      if fixed < 0 or fixed > 100000000 then raise exception 'invalid_fixed_commission'; end if;
    end if;
    ht := ht + round(qty * unit);
    if fixed is not null then
      com := com + fixed;
    else
      com := com + qty * unit * r / 100;
    end if;
    lines := lines || jsonb_build_object(
      'catalogue_id', line ->> 'catalogue_id',
      'label', line ->> 'label',
      'detail', left(coalesce(line ->> 'detail', ''), 300),
      'product_type', ptype,
      'qty', qty,
      'unit_cents', unit,
      'rate', r,
      'fixed_commission_cents', fixed,
      'total_cents', round(qty * unit)
    );
  end loop;
  new.lines := lines;
  new.total_ht_cents := ht;
  new.total_ttc_cents := round(ht * (1 + new.vat_rate / 100));
  new.commission_cents := round(com);
  if new.amount_paid_cents > new.total_ht_cents then
    new.amount_paid_cents := new.total_ht_cents;
  end if;

  if new.status = 'payee' and (tg_op = 'INSERT' or old.status <> 'payee') then
    if coalesce(new.amount_paid_cents, 0) <= 0 then
      new.amount_paid_cents := new.total_ht_cents;
    end if;
    new.paid_at := now();
  elsif new.status <> 'payee' then
    if tg_op = 'UPDATE' and old.status = 'payee' then
      new.paid_at := null;
    end if;
  end if;
  return new;
end;
$$;
