-- =========================================================
-- AK UNIVERSE — Commission enhancements (sales-portal handoff page 04)
-- Requires 005 (commissions), 007 (finance), 012 (sales_documents / commission_rates).
--   * sales_documents.amount_paid_cents  — HT actually collected (partial or full)
--   * line fixed_commission_cents       — optional flat fee instead of a % on a line
--   * subscriptions.commercial_id       — sales rep earning recurring commissions
--   * commissions.payment_id            — one commission per subscription payment (renewals)
-- =========================================================

-- ---------- Partial / real collection on commercial invoices ----------
alter table public.sales_documents
  add column if not exists amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0);

-- ---------- Recurring subscription commissions ----------
alter table public.subscriptions
  add column if not exists commercial_id uuid references public.profiles (id) on delete set null;
create index if not exists subscriptions_commercial_idx on public.subscriptions (commercial_id);

alter table public.commissions
  add column if not exists payment_id uuid references public.payments (id) on delete set null;
create unique index if not exists commissions_payment_key on public.commissions (payment_id);

-- Admins may assign / clear the sales rep on a subscription.
create policy "subscriptions: admin update commercial" on public.subscriptions
  for update using (public.is_admin()) with check (public.is_admin());

-- Totals, VAT, commission (with optional flat fee per line) and paid_at.
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
    -- Partial collections keep amount_paid; only clear the stamp when leaving "payee".
    if tg_op = 'UPDATE' and old.status = 'payee' then
      new.paid_at := null;
    end if;
  end if;
  return new;
end;
$$;

-- Paid (or partially collected) invoice → commission on amount actually collected HT.
create or replace function public.sales_documents_commission()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  owed integer;
begin
  if new.kind = 'facture' and new.salesperson_id is not null and new.amount_paid_cents > 0
     and (tg_op = 'INSERT'
          or old.status is distinct from new.status
          or old.amount_paid_cents is distinct from new.amount_paid_cents
          or old.commission_cents is distinct from new.commission_cents) then
    if new.total_ht_cents <= 0 then
      owed := 0;
    else
      owed := round(new.commission_cents::numeric * least(new.amount_paid_cents, new.total_ht_cents)::numeric / new.total_ht_cents);
    end if;
    insert into public.commissions (commercial_id, document_id, amount_cents, status)
    values (new.salesperson_id, new.id, owed, 'en_attente')
    on conflict (document_id) do update
      set amount_cents = excluded.amount_cents,
          commercial_id = excluded.commercial_id
      where public.commissions.status = 'en_attente';
  end if;
  return null;
end;
$$;

-- Create a subscription commission for one paid payment row (first checkout or renewal).
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

  select cr.rate into rate from public.commission_rates cr where cr.product_type = 'abonnements';
  if rate is null then
    select commission_rate into rate from public.profiles where id = rep;
  end if;
  rate := coalesce(rate, 10);
  owed := greatest(0, round(pay.amount_cents::numeric * rate / 100));

  insert into public.commissions (commercial_id, subscription_id, payment_id, amount_cents, status)
  values (rep, sub.id, pay.id, owed, 'en_attente')
  on conflict (payment_id) do nothing;
end;
$$;

grant execute on function public.ensure_subscription_commission(uuid) to authenticated, service_role;
