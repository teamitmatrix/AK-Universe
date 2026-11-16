-- =========================================================
-- AK UNIVERSE — Sales tools of the Commercial space (sales-portal handoff, pages 04–06)
-- Requires 005 (commissions), 008 (tasks) and 011 (prospects, customers, is_active_commercial).
--   * commission_rates  rate per product type (handoff page 04: agents 15 %, subscriptions 10 %, marketing 12 %,
--                       videos 10 % …). Read by the database itself when a quote / invoice is saved.
--   * sales_documents   quotes (devis) and invoices (factures) written by a rep. Line prices come from the
--                       catalogue (server code); totals, VAT and commission are RECOMPUTED here by a trigger from
--                       the lines and commission_rates — whatever a browser sends, a rep cannot choose their rate.
--                       A paid invoice creates one "en attente" commission (validated / paid by an admin, as before).
--   * agenda_events     the rep's own calendar (calls, meetings, reminders, visits)
--   * tasks             reps may now create, edit and delete their OWN tasks; tasks given by an admin stay
--                       tick-only for them (set_task_done). New columns: priority, client_name.
-- A rep only ever reads / writes their own rows (RLS), and only while their account is active.
-- =========================================================

-- ---------- Commission rates per product type ----------
create table if not exists public.commission_rates (
  product_type  text primary key check (product_type ~ '^[a-z_]{2,30}$'),
  rate          numeric(5, 2) not null check (rate between 0 and 100),
  updated_at    timestamptz not null default now()
);
insert into public.commission_rates (product_type, rate) values
  ('agents', 15),       -- Agents IA: one-time setup
  ('abonnements', 10),  -- Agents IA / AK Universe subscriptions (recurring)
  ('marketing', 12),    -- Marketing packages and services
  ('videos', 10),       -- Video services
  ('options', 10),      -- Additional options
  ('prestations', 12)   -- One-off services (custom lines)
on conflict (product_type) do nothing;
alter table public.commission_rates enable row level security;
create policy "commission_rates: staff read" on public.commission_rates
  for select using (public.is_active_commercial() or public.is_admin());
create policy "commission_rates: admin writes" on public.commission_rates
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Quotes & invoices ----------
create table if not exists public.document_counters (
  kind  text not null,
  year  integer not null,
  last  integer not null default 0,
  primary key (kind, year)
);
alter table public.document_counters enable row level security; -- no policy: only the numbering trigger uses it

create table if not exists public.sales_documents (
  id                uuid primary key default gen_random_uuid(),
  number            text unique,
  kind              text not null check (kind in ('devis', 'facture')),
  salesperson_id    uuid references public.profiles (id) on delete set null,
  customer_id       uuid references public.customers (id) on delete set null,
  quote_id          uuid references public.sales_documents (id) on delete set null,
  client_name       text not null check (char_length(client_name) between 1 and 160),
  client_email      text check (char_length(client_email) <= 254),
  client_siret      text check (client_siret ~ '^[0-9 ]{9,17}$'),
  client_address    text check (char_length(client_address) <= 300),
  issue_date        date not null default current_date,
  due_date          date,
  status            text not null default 'brouillon' check (status in ('brouillon', 'en_attente', 'validee', 'payee', 'annulee')),
  lines             jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 50),
  vat_rate          numeric(5, 2) not null default 20 check (vat_rate between 0 and 30),
  total_ht_cents    integer not null default 0 check (total_ht_cents >= 0),
  total_ttc_cents   integer not null default 0 check (total_ttc_cents >= 0),
  commission_cents  integer not null default 0 check (commission_cents >= 0),
  notes             text check (char_length(notes) <= 2000),
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- A quote is never "paid"; an invoice is never "validated" (it is issued, then paid).
  constraint sales_documents_status_by_kind check ((kind = 'devis' and status <> 'payee') or (kind = 'facture' and status <> 'validee'))
);
create index if not exists sales_documents_rep_idx on public.sales_documents (salesperson_id, issue_date desc);
create trigger sales_documents_touch before update on public.sales_documents
  for each row execute function public.touch_updated_at();

-- Invoice commissions: one per invoice (idempotent, like project_id for video sales).
alter table public.commissions add column if not exists document_id uuid references public.sales_documents (id) on delete set null;
create unique index if not exists commissions_document_key on public.commissions (document_id);

-- Numbering (DEV-2026-0001 / FAC-2026-0001), totals, commission and locks — one BEFORE trigger.
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
    -- Paid invoices and validated quotes are final for the rep; only an admin may still change them.
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
    -- Most specific rate wins (handoff page 04): product type, else the rep's own rate, else 10 %.
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
create trigger sales_documents_compute before insert or update on public.sales_documents
  for each row execute function public.sales_documents_compute();

-- A paid invoice is a collected sale: its commission is created "en attente" for the admin to validate.
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
create trigger sales_documents_commission after insert or update on public.sales_documents
  for each row execute function public.sales_documents_commission();

alter table public.sales_documents enable row level security;
create policy "sales_documents: rep reads own, admin all" on public.sales_documents
  for select using ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
create policy "sales_documents: rep creates own" on public.sales_documents
  for insert with check ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
create policy "sales_documents: rep updates own" on public.sales_documents
  for update using ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin())
  with check ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
-- Only drafts can be deleted (issued documents are accounting history).
create policy "sales_documents: rep deletes own drafts" on public.sales_documents
  for delete using (((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin()) and status = 'brouillon');

-- ---------- Agenda ----------
create table if not exists public.agenda_events (
  id                uuid primary key default gen_random_uuid(),
  salesperson_id    uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 160),
  client_name       text check (char_length(client_name) <= 160),
  type              text not null check (type in ('appel', 'rdv', 'rappel', 'visite')),
  starts_at         timestamptz not null,
  duration_minutes  integer not null default 30 check (duration_minutes between 5 and 1440),
  location          text check (char_length(location) <= 200),
  notes             text check (char_length(notes) <= 2000),
  status            text not null default 'prevu' check (status in ('prevu', 'fait', 'annule')),
  prospect_id       uuid references public.prospects (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists agenda_events_rep_idx on public.agenda_events (salesperson_id, starts_at);
create trigger agenda_events_touch before update on public.agenda_events
  for each row execute function public.touch_updated_at();
alter table public.agenda_events enable row level security;
create policy "agenda_events: rep reads own, admin all" on public.agenda_events
  for select using ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
create policy "agenda_events: rep creates own" on public.agenda_events
  for insert with check (salesperson_id = auth.uid() and public.is_active_commercial());
create policy "agenda_events: rep updates own" on public.agenda_events
  for update using (salesperson_id = auth.uid() and public.is_active_commercial())
  with check (salesperson_id = auth.uid() and public.is_active_commercial());
create policy "agenda_events: rep deletes own" on public.agenda_events
  for delete using (salesperson_id = auth.uid() and public.is_active_commercial());

-- ---------- Tasks: reps manage their own ----------
alter table public.tasks
  add column if not exists priority text not null default 'normale' check (priority in ('basse', 'normale', 'haute')),
  add column if not exists client_name text check (char_length(client_name) <= 160);
-- A task the rep created for themselves (assigned_by = assigned_to = the rep). Tasks given by an admin are not concerned.
create policy "tasks: rep creates own" on public.tasks
  for insert with check (assigned_to = auth.uid() and assigned_by = auth.uid() and public.is_active_commercial());
create policy "tasks: rep updates own" on public.tasks
  for update using (assigned_to = auth.uid() and assigned_by = auth.uid() and public.is_active_commercial())
  with check (assigned_to = auth.uid() and assigned_by = auth.uid() and public.is_active_commercial());
create policy "tasks: rep deletes own" on public.tasks
  for delete using (assigned_to = auth.uid() and assigned_by = auth.uid() and public.is_active_commercial());
