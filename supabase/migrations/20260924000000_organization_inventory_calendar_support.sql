-- Keep each booking write scoped to the organization selected by the app and serialize
-- booking/block writes on the same unit. The slug is public client input, not app identity.
begin;

create or replace function public.lock_and_validate_availability_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lock order for inventory writes: guest advisory lock (booking RPC only), then this
  -- unit advisory lock, then booking/block rows. No inventory path takes these in reverse.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.unit_id::text, 981723)
  );
  if exists (
    select 1 from public.bookings b
     where b.unit_id = new.unit_id
       and b.date_range && daterange(new.check_in, new.check_out, '[)')
       and (b.status = 'CONFIRMED'
         or (b.status = 'PENDING_PAYMENT' and b.hold_expires_at > now()))
  ) then
    raise exception 'unit_unavailable' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger availability_blocks_validate_inventory
  before insert or update
  on public.availability_blocks
  for each row execute function public.lock_and_validate_availability_block();

revoke execute on function public.lock_and_validate_availability_block() from public, anon, authenticated;

create or replace function public.create_booking(
  p_organization_slug text,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org_id uuid;
  v_unit public.units;
  v_property public.properties;
  v_nights integer;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select o.id into v_org_id
    from public.organizations o
   where o.slug = p_organization_slug and o.is_active;
  if v_org_id is null then
    raise exception 'organization_not_bookable' using errcode = 'P0002';
  end if;

  select * into v_unit from public.units u where u.id = p_unit_id;
  if v_unit.id is null then
    raise exception 'unit_not_found' using errcode = 'P0002';
  end if;
  select * into v_property from public.properties p where p.id = v_unit.property_id;
  if not v_unit.is_active or v_property.id is null or not v_property.is_active
     or v_property.organization_id <> v_org_id then
    raise exception 'unit_not_bookable' using errcode = 'P0002';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in
     or p_check_in < (now() at time zone v_property.timezone)::date then
    raise exception 'invalid_date_range' using errcode = '22007';
  end if;
  if p_guest_count is null or p_guest_count < 1 or p_guest_count > v_unit.max_guests then
    raise exception 'invalid_guest_count' using errcode = '22023';
  end if;
  if p_guest_name is null or btrim(p_guest_name) = '' then
    raise exception 'invalid_guest_name' using errcode = '22023';
  end if;
  if p_guest_email is null or btrim(p_guest_email) = '' then
    raise exception 'invalid_guest_email' using errcode = '22023';
  end if;

  -- Guest lock prevents multiple holds per guest. Unit lock coordinates with both other
  -- booking transactions and administrative availability_block inserts/updates.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_unit_id::text, 981723));

  if exists (
    select 1 from public.availability_blocks ab
     where ab.unit_id = p_unit_id
       and ab.date_range && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'unit_unavailable' using errcode = '23P01';
  end if;

  -- Revalidate activation and ownership after acquiring the unit lock; this is the
  -- authorization check against current server state at the write boundary.
  perform 1 from public.units u
    join public.properties p on p.id = u.property_id
    join public.organizations o on o.id = p.organization_id
   where u.id = p_unit_id and u.is_active and p.is_active and o.is_active
     and o.id = v_org_id
   for share of u, p, o;
  if not found then
    raise exception 'unit_not_bookable' using errcode = 'P0002';
  end if;

  update public.bookings
     set status = 'CANCELED', canceled_at = now(), cancellation_reason = 'SYSTEM'
   where guest_profile_id = v_uid and status = 'PENDING_PAYMENT';
  update public.bookings
     set status = 'CANCELED', canceled_at = now(), cancellation_reason = 'HOLD_EXPIRED'
   where unit_id = p_unit_id and status = 'PENDING_PAYMENT' and hold_expires_at <= now();

  v_nights := p_check_out - p_check_in;
  insert into public.bookings (
    unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, guest_phone, currency,
    nightly_rate_minor, total_amount_minor
  ) values (
    p_unit_id, v_uid, p_check_in, p_check_out, p_guest_count,
    btrim(p_guest_name), lower(btrim(p_guest_email)),
    nullif(btrim(coalesce(p_guest_phone, '')), ''), v_unit.currency,
    v_unit.nightly_rate_minor, v_unit.nightly_rate_minor * v_nights
  ) returning * into v_booking;
  return v_booking;
exception
  when exclusion_violation then
    raise exception 'unit_unavailable' using errcode = '23P01';
end;
$$;

create or replace function public.create_booking(
  p_organization_slug text,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_special_requests text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_requests text := nullif(btrim(coalesce(p_special_requests, '')), '');
begin
  if v_requests is not null and char_length(v_requests) > 500 then
    raise exception 'invalid_special_requests' using errcode = '22023';
  end if;
  v_booking := public.create_booking(
    p_organization_slug, p_unit_id, p_check_in, p_check_out, p_guest_count,
    p_guest_name, p_guest_email, p_guest_phone
  );
  update public.bookings set special_requests = v_requests
   where id = v_booking.id returning * into v_booking;
  return v_booking;
end;
$$;

-- Retire old unscoped entry points so callers cannot bypass organization membership.
revoke execute on function public.create_booking(uuid, date, date, integer, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_booking(uuid, date, date, integer, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_booking(text, uuid, date, date, integer, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_booking(text, uuid, date, date, integer, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_booking(text, uuid, date, date, integer, text, text, text)
  to authenticated;
grant execute on function public.create_booking(text, uuid, date, date, integer, text, text, text, text)
  to authenticated;

comment on function public.create_booking(text, uuid, date, date, integer, text, text, text) is
  'Creates one server-priced pending booking after revalidating the active organization, property, unit, date range and availability blocks.';
comment on function public.create_booking(text, uuid, date, date, integer, text, text, text, text) is
  'Organization-scoped booking creation with an optional special request.';

commit;
