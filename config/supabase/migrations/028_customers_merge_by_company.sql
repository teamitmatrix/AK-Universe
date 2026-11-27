-- =========================================================
-- Merge customers by company name for a given sales rep.
-- convert_prospect already matched on e-mail; also reuse an existing
-- customer when the prospect's company matches (case-insensitive).
-- =========================================================

create or replace function public.convert_prospect(p_prospect uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  p public.prospects;
  c uuid;
  acct uuid;
  org text;
begin
  select * into p from public.prospects where id = p_prospect for update;
  if not found then raise exception 'prospect_not_found'; end if;
  if not ((p.salesperson_id = auth.uid() and public.is_active_commercial()) or public.is_admin()) then
    raise exception 'forbidden';
  end if;
  if p.converted_at is not null then return p.customer_id; end if;
  if p.stage = 'perdu' then raise exception 'prospect_lost'; end if;

  if p.email is not null and p.email <> '' then
    select id into acct from public.profiles where lower(email) = lower(p.email) limit 1;
    select id into c from public.customers where salesperson_id = p.salesperson_id and lower(email) = lower(p.email) for update;
  end if;

  -- Same firm under another contact e-mail → reuse that customer fiche.
  if c is null then
    org := lower(nullif(trim(coalesce(p.company, '')), ''));
    if org is not null then
      select id into c
        from public.customers
       where salesperson_id = p.salesperson_id
         and (
           lower(nullif(trim(coalesce(company, '')), '')) = org
           or (company is null and lower(trim(name)) = org)
         )
       for update
       limit 1;
    end if;
  end if;

  if c is null then
    insert into public.customers (salesperson_id, name, company, email, phone, profile_id, source_prospect_id)
    values (
      p.salesperson_id,
      p.name,
      coalesce(nullif(trim(p.company), ''), p.name),
      nullif(lower(p.email), ''),
      p.phone,
      acct,
      p.id
    )
    returning id into c;
  else
    update public.customers
       set company = coalesce(company, p.company, p.name),
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
