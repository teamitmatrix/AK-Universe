-- =========================================================
-- AK UNIVERSE — Commission rates: three lines only
-- Agents IA · Marketing · Digital (site universes).
-- Requires 012 (commission_rates) and 015 (sales_documents_compute + per-rep rates).
-- Legacy product types stay in commission_rates for older devis lines; they are kept in sync by the admin save.
-- =========================================================

insert into public.commission_rates (product_type, rate)
select 'digital', coalesce(
  (select rate from public.commission_rates where product_type = 'videos'),
  10
)
on conflict (product_type) do nothing;

-- Align legacy rows with the three-line model (Agents IA / Marketing / Digital).
update public.commission_rates c
set rate = a.rate, updated_at = now()
from public.commission_rates a
where a.product_type = 'agents' and c.product_type = 'abonnements';

update public.commission_rates c
set rate = d.rate, updated_at = now()
from public.commission_rates d
where d.product_type = 'digital'
  and c.product_type in ('videos', 'options', 'prestations', 'consulting');

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
  rate_ai numeric;
  rate_mkt numeric;
  rate_dig numeric;
  line_rep numeric;
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

  select commission_rate, commission_rate_ai, commission_rate_marketing, commission_rate_digital
    into rep_rate, rate_ai, rate_mkt, rate_dig
    from public.profiles where id = new.salesperson_id;

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

    line_rep := case
      when ptype in ('agents', 'abonnements') then rate_ai
      when ptype = 'marketing' then rate_mkt
      when ptype in ('digital', 'videos', 'options', 'prestations', 'consulting') then rate_dig
      else null
    end;
    -- Per-rep line rate wins, then global product rate, then legacy single rate, then 10 %.
    r := coalesce(line_rep, r, rep_rate, 10);

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

-- Recurring AI subscriptions: Agents IA rate (legacy abonnements as fallback).
create or replace function public.ensure_subscription_commission(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  pay record;
  sub record;
  rep uuid;
  rate numeric;
  rate_ai numeric;
  owed integer;
begin
  select id, user_id, subscription_id, amount_cents, status, kind
    into pay from public.payments where id = p_payment_id;
  if not found or pay.kind <> 'subscription' or pay.status not in ('paid', 'complete') or pay.subscription_id is null then
    return;
  end if;
  if exists (select 1 from public.commissions where payment_id = pay.id) then
    return;
  end if;

  select id, user_id, commercial_id into sub
    from public.subscriptions where id = pay.subscription_id;
  if not found then return; end if;

  rep := sub.commercial_id;
  if rep is null then
    select salesperson_id into rep
      from public.customers
     where profile_id = coalesce(sub.user_id, pay.user_id)
     order by created_at desc
     limit 1;
  end if;
  if rep is null then return; end if;
  if not exists (select 1 from public.profiles where id = rep and role = 'commercial' and active) then
    return;
  end if;

  select commission_rate, commission_rate_ai into rate, rate_ai from public.profiles where id = rep;
  if rate_ai is null then
    select cr.rate into rate from public.commission_rates cr where cr.product_type = 'agents';
    if rate is null then
      select cr.rate into rate from public.commission_rates cr where cr.product_type = 'abonnements';
    end if;
  end if;
  rate := coalesce(rate_ai, rate, 10);
  owed := greatest(0, round(pay.amount_cents::numeric * rate / 100));

  insert into public.commissions (commercial_id, subscription_id, payment_id, amount_cents, status)
  values (rep, sub.id, pay.id, owed, 'en_attente')
  on conflict (payment_id) do nothing;
end;
$$;
