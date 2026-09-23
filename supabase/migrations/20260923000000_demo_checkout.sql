-- A temporary demonstration checkout. Both RPCs run with the caller's auth.uid().
create or replace function public.create_booking(
  p_unit_id uuid, p_check_in date, p_check_out date, p_guest_count integer,
  p_guest_name text, p_guest_email text, p_guest_phone text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_unit public.units;
  v_property public.properties;
  v_nights integer;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_unit from public.units u where u.id = p_unit_id;
  if v_unit.id is null then
    raise exception 'unit_not_found' using errcode = 'P0002';
  end if;
  select * into v_property from public.properties p where p.id = v_unit.property_id;
  if not v_unit.is_active or v_property.id is null or not v_property.is_active then
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

  -- Serialize this guest's checkouts; otherwise two devices could each leave a hold.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  -- One pending booking per guest limits abandoned holds. Replacing a pending
  -- booking releases its inventory in this same transaction before the new insert.
  update public.bookings
     set status = 'CANCELED', canceled_at = now(), cancellation_reason = 'SYSTEM'
   where guest_profile_id = v_uid and status = 'PENDING_PAYMENT';

  -- Expired holds from other guests still participate in the exclusion constraint.
  update public.bookings
     set status = 'CANCELED', canceled_at = now(), cancellation_reason = 'HOLD_EXPIRED'
   where unit_id = p_unit_id and status = 'PENDING_PAYMENT'
     and hold_expires_at <= now();

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

comment on function public.create_booking(uuid, date, date, integer, text, text, text) is
  'Creates one server-priced pending booking per authenticated guest, replacing the guest''s previous pending hold transactionally.';

revoke execute on function public.create_booking(uuid, date, date, integer, text, text, text)
  from public, anon;
grant execute on function public.create_booking(uuid, date, date, integer, text, text, text)
  to authenticated;

create function public.confirm_demo_payment(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
    from public.bookings b
   where b.id = p_booking_id and b.guest_profile_id = (select auth.uid())
   for update;

  if v_booking.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_booking.status = 'CONFIRMED' then
    return v_booking;
  end if;
  if v_booking.status <> 'PENDING_PAYMENT' then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_booking.hold_expires_at <= now() then
    update public.bookings
       set status = 'CANCELED', canceled_at = now(), cancellation_reason = 'HOLD_EXPIRED'
     where id = p_booking_id returning * into v_booking;
    -- Returning the canceled row commits the cancellation; raising would roll it back.
    return v_booking;
  end if;
  update public.bookings
     set status = 'CONFIRMED', confirmed_at = now()
   where id = p_booking_id returning * into v_booking;
  -- No payments row: that table is reserved for real Stripe PaymentIntents.
  return v_booking;
end;
$$;

comment on function public.confirm_demo_payment(uuid) is
  'Temporary demonstration payment provider. A Stripe webhook will replace this confirmation path.';

revoke execute on function public.confirm_demo_payment(uuid) from public, anon;
grant execute on function public.confirm_demo_payment(uuid) to authenticated;
