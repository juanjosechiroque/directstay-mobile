drop function public.search_available_units(text, date, date, integer, text, uuid);

create function public.search_available_units(
  p_organization_slug text,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_locale text default 'es',
  p_unit_id uuid default null,
  p_property_id uuid default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_range daterange;
  v_nights integer;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_date_range' using errcode = '22007';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'invalid_guest_count' using errcode = '22023';
  end if;

  v_range := daterange(p_check_in, p_check_out, '[)');
  v_nights := p_check_out - p_check_in;

  return query
  select jsonb_build_object(
    'unit', public.build_unit_json(u.id, p_locale),
    'property', jsonb_build_object(
      'id', p.id,
      'name', coalesce(pt.name, p.name),
      'slug', p.slug,
      'timezone', p.timezone
    ),
    'nights', v_nights,
    'totalAmountMinor', u.nightly_rate_minor * v_nights,
    'currency', u.currency
  )
  from public.units u
  join public.properties p on p.id = u.property_id
  left join public.property_translations pt on pt.property_id = p.id and pt.locale = p_locale
  join public.organizations o on o.id = p.organization_id
  where o.slug = p_organization_slug
    and o.is_active
    and p.is_active
    and u.is_active
    and u.max_guests >= p_guests
    and (p_unit_id is null or u.id = p_unit_id)
    and (p_property_id is null or p.id = p_property_id)
    and not exists (
      select 1
        from public.bookings b
       where b.unit_id = u.id
         and b.date_range && v_range
         and (
           b.status = 'CONFIRMED'
           or (b.status = 'PENDING_PAYMENT' and b.hold_expires_at > now())
         )
    )
    and not exists (
      select 1
        from public.availability_blocks ab
       where ab.unit_id = u.id
         and ab.date_range && v_range
    )
  order by u.nightly_rate_minor;
end;
$$;

revoke execute on function public.search_available_units(text, date, date, integer, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.search_available_units(text, date, date, integer, text, uuid, uuid)
  to anon, authenticated;

comment on function public.search_available_units(text, date, date, integer, text, uuid, uuid) is
  'Server-authoritative availability and integer quote for a brand, optionally scoped to one active property or unique unit.';
