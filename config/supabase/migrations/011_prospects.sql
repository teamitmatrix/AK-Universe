-- =========================================================
-- AK UNIVERSE — Prospect pipeline + customer records (sales-portal handoff, page 05)
-- Requires 005_admin_space.sql.
--   * prospects        one row per lead, owned by a sales rep (salesperson_id); 7 pipeline stages
--   * prospect_events  server-side history: creation, every stage change, conversion (written by triggers /
--                      functions only — nobody can insert, edit or delete history through the API)
--   * customers        customer record created (or merged) when a prospect is converted; the prospect keeps a
--                      foreign key to it and the customer keeps its originating prospect, so history survives
--   * convert_prospect() one transaction: create-or-merge the customer, link both ways, stage = gagné, log it
-- A rep only ever reads / writes their OWN prospects and customers (RLS), and only while their account is active.
-- Leads coming from the website (video requests assigned by an admin) get a prospect linked by project_id.
-- =========================================================

create or replace function public.is_active_commercial()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'commercial' and active);
$$;

-- ---------- Customers ----------
create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  salesperson_id      uuid references public.profiles (id) on delete set null,
  name                text not null check (char_length(name) between 1 and 160),
  company             text check (char_length(company) <= 160),
  email               text check (char_length(email) <= 254),
  phone               text check (char_length(phone) <= 40),
  -- The site account with the same e-mail, when one exists (client space, subscriptions, projects).
  profile_id          uuid references public.profiles (id) on delete set null,
  source_prospect_id  uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- Merge key: one customer per rep and e-mail address.
create unique index if not exists customers_rep_email_key on public.customers (salesperson_id, lower(email));
create index if not exists customers_rep_idx on public.customers (salesperson_id, created_at desc);
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

-- ---------- Prospects ----------
create table if not exists public.prospects (
  id                uuid primary key default gen_random_uuid(),
  salesperson_id    uuid not null references public.profiles (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  company           text check (char_length(company) <= 160),
  email             text check (char_length(email) <= 254),
  phone             text check (char_length(phone) <= 40),
  source            text check (char_length(source) <= 40),
  need              text check (char_length(need) <= 500),
  budget_cents      integer check (budget_cents >= 0),
  stage             text not null default 'nouveau'
                      check (stage in ('nouveau', 'contacte', 'qualifie', 'devis_envoye', 'negociation', 'gagne', 'perdu')),
  next_action       text check (char_length(next_action) <= 200),
  next_followup_at  timestamptz,
  notes             text check (char_length(notes) <= 4000),
  lost_reason       text check (char_length(lost_reason) <= 300),
  -- Website lead this prospect comes from (one prospect per video request).
  project_id        uuid unique references public.video_projects (id) on delete set null,
  customer_id       uuid references public.customers (id) on delete set null,
  converted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists prospects_rep_stage_idx on public.prospects (salesperson_id, stage);
alter table public.customers
  add constraint customers_source_prospect_fkey foreign key (source_prospect_id) references public.prospects (id) on delete set null;
create trigger prospects_touch before update on public.prospects
  for each row execute function public.touch_updated_at();

-- ---------- History ----------
create table if not exists public.prospect_events (
  id           bigint generated always as identity primary key,
  prospect_id  uuid not null references public.prospects (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  kind         text not null check (kind in ('created', 'stage', 'converted', 'reassigned')),
  from_stage   text,
  to_stage     text,
  created_at   timestamptz not null default now()
);
create index if not exists prospect_events_prospect_idx on public.prospect_events (prospect_id, created_at);

-- Guards + history, whatever the path (rep, admin, server code):
--   * the link to a customer and the conversion date can only be set by convert_prospect();
--   * a converted prospect stays "gagné";
--   * every creation, stage change and change of owner is logged.
create or replace function public.prospects_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  converting boolean := coalesce(current_setting('aku.converting', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and (new.customer_id is not null or new.converted_at is not null) then
      raise exception 'prospect_conversion_only_through_convert_prospect';
    end if;
    return new;
  end if;
  if not converting and auth.uid() is not null
     and (new.customer_id is distinct from old.customer_id or new.converted_at is distinct from old.converted_at) then
    raise exception 'prospect_conversion_only_through_convert_prospect';
  end if;
  if old.converted_at is not null and new.stage <> 'gagne' then
    raise exception 'converted_prospect_stays_won';
  end if;
  return new;
end;
$$;
create trigger prospects_guard before insert or update on public.prospects
  for each row execute function public.prospects_guard();

create or replace function public.prospects_log()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.prospect_events (prospect_id, actor_id, kind, to_stage) values (new.id, auth.uid(), 'created', new.stage);
  else
    if new.stage is distinct from old.stage and coalesce(current_setting('aku.converting', true), '') <> '1' then
      insert into public.prospect_events (prospect_id, actor_id, kind, from_stage, to_stage) values (new.id, auth.uid(), 'stage', old.stage, new.stage);
    end if;
    if new.salesperson_id is distinct from old.salesperson_id then
      insert into public.prospect_events (prospect_id, actor_id, kind, from_stage, to_stage) values (new.id, auth.uid(), 'reassigned', new.stage, new.stage);
    end if;
  end if;
  return null;
end;
$$;
create trigger prospects_log after insert or update on public.prospects
  for each row execute function public.prospects_log();

-- ---------- Row Level Security ----------
alter table public.prospects enable row level security;
alter table public.customers enable row level security;
alter table public.prospect_events enable row level security;

create policy "prospects: rep reads own, admin all" on public.prospects
  for select using ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
create policy "prospects: rep creates own" on public.prospects
  for insert with check ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
-- WITH CHECK: a rep cannot hand a prospect over to someone else.
create policy "prospects: rep updates own" on public.prospects
  for update using ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin())
  with check ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
-- Converted prospects are kept (they are the customer's history).
create policy "prospects: rep deletes own unconverted" on public.prospects
  for delete using (((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin()) and converted_at is null);

create policy "customers: rep reads own, admin all" on public.customers
  for select using ((salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin());
-- No insert / update / delete policy: customers are created only by convert_prospect().

-- History is visible with its prospect (the sub-select itself goes through the prospects policy).
create policy "prospect_events: read with prospect" on public.prospect_events
  for select using (exists (select 1 from public.prospects p where p.id = prospect_id));

-- ---------- Conversion (one transaction) ----------
create or replace function public.convert_prospect(p_prospect uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  p public.prospects;
  c uuid;
  acct uuid;
begin
  select * into p from public.prospects where id = p_prospect for update;
  if not found then raise exception 'prospect_not_found'; end if;
  if not ((p.salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin()) then
    raise exception 'forbidden';
  end if;
  if p.converted_at is not null then return p.customer_id; end if; -- idempotent: a double click converts once
  if p.stage = 'perdu' then raise exception 'prospect_lost'; end if;

  if p.email is not null and p.email <> '' then
    select id into acct from public.profiles where lower(email) = lower(p.email) limit 1;
    select id into c from public.customers where salesperson_id = p.salesperson_id and lower(email) = lower(p.email) for update;
  end if;

  if c is null then
    insert into public.customers (salesperson_id, name, company, email, phone, profile_id, source_prospect_id)
    values (p.salesperson_id, p.name, p.company, nullif(lower(p.email), ''), p.phone, acct, p.id)
    returning id into c;
  else
    -- Merge: keep what the customer record has, fill what it lacks.
    update public.customers
       set company = coalesce(company, p.company),
           phone = coalesce(phone, p.phone),
           profile_id = coalesce(profile_id, acct)
     where id = c;
  end if;

  perform set_config('aku.converting', '1', true);
  update public.prospects set customer_id = c, converted_at = now(), stage = 'gagne' where id = p.id;
  perform set_config('aku.converting', '', true);
  insert into public.prospect_events (prospect_id, actor_id, kind, from_stage, to_stage)
  values (p.id, auth.uid(), 'converted', p.stage, 'gagne');
  return c;
end;
$$;
revoke all on function public.convert_prospect(uuid) from public, anon;
grant execute on function public.convert_prospect(uuid) to authenticated;
revoke all on function public.is_active_commercial() from public, anon;
grant execute on function public.is_active_commercial() to authenticated;

-- ---------- Existing website leads already assigned to a rep ----------
-- Open requests (not paid yet) become prospects of their rep: "nouveau" if just received, "devis envoyé"
-- when the deposit is awaited. Paid projects are sales, not prospects.
insert into public.prospects (salesperson_id, name, company, email, phone, source, need, budget_cents, stage, project_id, created_at)
select vp.commercial_id,
       left(coalesce(nullif(trim(concat_ws(' ', vp.contact ->> 'prenom', vp.contact ->> 'nom')), ''), vp.contact ->> 'entreprise', vp.contact ->> 'email', vp.reference), 120),
       left(nullif(vp.contact ->> 'entreprise', ''), 160),
       left(nullif(lower(vp.contact ->> 'email'), ''), 254),
       left(nullif(vp.contact ->> 'tel', ''), 40),
       'site_web',
       left((select string_agg(i ->> 'service', ' + ') from jsonb_array_elements(vp.items) i), 500),
       vp.total_cents,
       case when vp.status = 'acompte_en_attente' then 'devis_envoye' else 'nouveau' end,
       vp.id,
       vp.created_at
  from public.video_projects vp
 where vp.commercial_id is not null
   and vp.status in ('nouveau', 'acompte_en_attente')
on conflict (project_id) do nothing;
