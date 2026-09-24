alter table public.bookings
  add column special_requests text
  constraint bookings_special_requests_length
    check (special_requests is null or
      (char_length(special_requests) <= 500 and btrim(special_requests) <> ''));

comment on column public.bookings.special_requests is
  'Optional guest-provided request, limited to 500 characters. It is not a guarantee of service.';

create function public.create_booking(
  p_unit_id uuid, p_check_in date, p_check_out date, p_guest_count integer,
  p_guest_name text, p_guest_email text, p_guest_phone text, p_special_requests text
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
    p_unit_id, p_check_in, p_check_out, p_guest_count,
    p_guest_name, p_guest_email, p_guest_phone
  );
  update public.bookings
     set special_requests = v_requests
   where id = v_booking.id
   returning * into v_booking;
  return v_booking;
end;
$$;

comment on function public.create_booking(uuid, date, date, integer, text, text, text, text) is
  'Creates a server-priced booking and stores an optional guest request in the same transaction.';

revoke execute on function public.create_booking(uuid, date, date, integer, text, text, text, text)
  from public, anon;
grant execute on function public.create_booking(uuid, date, date, integer, text, text, text, text)
  to authenticated;
