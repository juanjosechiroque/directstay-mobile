alter table public.properties
  add column map_reference text
    check (map_reference is null or btrim(map_reference) <> ''),
  add column map_latitude numeric(9, 6),
  add column map_longitude numeric(9, 6),
  add constraint properties_map_coordinates_pair check (
    (map_latitude is null and map_longitude is null)
    or (map_latitude is not null and map_longitude is not null
        and map_latitude between -90 and 90
        and map_longitude between -180 and 180)
  );

update public.properties
   set map_reference = 'Plaza de Armas, Urubamba, Cusco, Perú',
       map_latitude = -13.305940,
       map_longitude = -72.115960
 where id = '22222222-2222-2222-2222-222222222222';

update public.properties
   set map_reference = 'Plaza de Armas, Cusco, Perú',
       map_latitude = -13.516770,
       map_longitude = -71.978780
 where id = '22222222-2222-2222-2222-222222222223';

create or replace function public.build_property_json(p_property_id uuid, p_locale text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(pt.name, p.name),
    'slug', p.slug,
    'locationLabel', coalesce(pt.location_label, ''),
    'mapReference', p.map_reference,
    'mapLatitude', p.map_latitude,
    'mapLongitude', p.map_longitude,
    'shortDescription', coalesce(pt.short_description, ''),
    'description', coalesce(pt.description, p.description, ''),
    'timezone', p.timezone,
    'checkInTime', p.check_in_time::text,
    'checkOutTime', p.check_out_time::text,
    'currency', p.currency,
    'contactWhatsapp', p.contact_whatsapp,
    'contactPhone', p.contact_phone,
    'highlights', coalesce((
      select jsonb_agg(ph.highlight_code order by ph.sort_order)
        from public.property_highlights ph
       where ph.property_id = p.id
    ), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', pi.id,
               'storagePath', pi.storage_path,
               'altText', coalesce(pit.alt_text, '')
             ) order by pi.sort_order)
        from public.property_images pi
        left join public.property_image_translations pit
          on pit.image_id = pi.id and pit.locale = p_locale
       where pi.property_id = p.id
    ), '[]'::jsonb),
    'units', coalesce((
      select jsonb_agg(public.build_unit_json(u.id, p_locale) order by u.nightly_rate_minor)
        from public.units u
       where u.property_id = p.id and u.is_active
    ), '[]'::jsonb)
  )
  from public.properties p
  left join public.property_translations pt
    on pt.property_id = p.id and pt.locale = p_locale
  where p.id = p_property_id;
$$;
