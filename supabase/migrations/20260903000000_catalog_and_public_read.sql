-- DirectStay — public catalog, localized content, licensed media and private stay info.
--
-- Incremental migration. The published schema (20260902000000_initial_schema.sql) and the
-- updated_at trigger migration are NOT edited. This migration:
--
--   1. Adds the organization brand identity the client selects via
--      EXPO_PUBLIC_ORGANIZATION_SLUG (slug + is_active).
--   2. Adds localized public catalog content (property/unit translation tables), public
--      amenities and property highlights.
--   3. Adds license metadata to unit images and a parallel property image model.
--   4. Adds private stay information (Wi-Fi / arrival) with no public read path.
--   5. Adds public read RPCs scoped to the active organization:
--        get_catalog(org_slug, locale)
--        get_unit(org_slug, unit_id, locale)
--        search_available_units(org_slug, check_in, check_out, guests, locale, unit_id)
--      and the authenticated-only get_stay_information(booking_id).
--   6. Prepares and tests create_booking(..) in PostgreSQL. It is deliberately revoked
--      from anon and authenticated: the mobile client must NOT create bookings or
--      confirm payments until the Stripe phase.
--   7. Creates the public-read `catalog-media` storage bucket with no client write path.
--
-- Localized content decision: text lives in `(entity_id, locale)` translation tables.
-- Base tables keep a single default-language column as a fallback, but the public read
-- model always resolves through the requested locale. Money stays in integer minor units.

begin;

-- ---------------------------------------------------------------------------
-- 1. Organization brand identity
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column slug text,
  add column is_active boolean not null default true;

-- Backfill existing rows deterministically. On a fresh database the table is empty and
-- this is a no-op; the seed sets the canonical slug.
update public.organizations
   set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
 where slug is null;

alter table public.organizations
  alter column slug set not null;

alter table public.organizations
  add constraint organizations_slug_format
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint organizations_slug_key unique (slug);

-- Public business contact for a property (not guest PII). Private arrivals directions and
-- Wi-Fi live in property_stay_information below.
alter table public.properties
  add column contact_whatsapp text,
  add column contact_phone text;

alter table public.properties
  add constraint properties_contact_whatsapp_format
    check (contact_whatsapp is null or contact_whatsapp ~ '^\+?[0-9 ()-]{6,20}$'),
  add constraint properties_contact_phone_format
    check (contact_phone is null or contact_phone ~ '^\+?[0-9 ()-]{6,20}$');

-- ---------------------------------------------------------------------------
-- 2. Localized public catalog content
-- ---------------------------------------------------------------------------

create table public.property_translations (
  property_id uuid not null references public.properties (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}$'),
  name text not null check (btrim(name) <> ''),
  location_label text,
  short_description text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, locale)
);

create table public.unit_translations (
  unit_id uuid not null references public.units (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}$'),
  summary text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (unit_id, locale)
);

-- Public amenity catalog. `is_public` lets an internal-only amenity exist later without
-- leaking into the public read model.
create table public.amenities (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  is_public boolean not null default true
);

create table public.unit_amenities (
  unit_id uuid not null references public.units (id) on delete cascade,
  amenity_code text not null references public.amenities (code) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  primary key (unit_id, amenity_code),
  unique (unit_id, sort_order)
);

create table public.property_highlights (
  property_id uuid not null references public.properties (id) on delete cascade,
  highlight_code text not null check (highlight_code ~ '^[a-z0-9_]+$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  primary key (property_id, highlight_code),
  unique (property_id, sort_order)
);

-- ---------------------------------------------------------------------------
-- 3. Licensed media
-- ---------------------------------------------------------------------------

-- Extend the existing unit image relation instead of replacing it. Every catalog image
-- carries its provenance so an unverified photo can never be presented as licensed.
alter table public.unit_images
  add column source_url text,
  add column author text,
  add column license text,
  add column attribution_text text,
  add column license_verified_at timestamptz,
  add column verification_note text,
  add column updated_at timestamptz not null default now();

alter table public.unit_images
  add constraint unit_images_license_known
    check (license is null or license in ('CC0', 'PUBLIC_DOMAIN', 'CC_BY', 'CC_BY_SA', 'COMMERCIAL'));

create table public.unit_image_translations (
  image_id uuid not null references public.unit_images (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}$'),
  alt_text text,
  primary key (image_id, locale)
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique check (btrim(storage_path) <> ''),
  sort_order integer not null default 0 check (sort_order >= 0),
  source_url text,
  author text,
  license text,
  attribution_text text,
  license_verified_at timestamptz,
  verification_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, sort_order),
  constraint property_images_license_known
    check (license is null or license in ('CC0', 'PUBLIC_DOMAIN', 'CC_BY', 'CC_BY_SA', 'COMMERCIAL'))
);

create table public.property_image_translations (
  image_id uuid not null references public.property_images (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}$'),
  alt_text text,
  primary key (image_id, locale)
);

-- ---------------------------------------------------------------------------
-- 4. Private stay information
-- ---------------------------------------------------------------------------

-- Wi-Fi and arrival instructions. There is NO public read path: RLS is enabled with no
-- policy and all grants are revoked. The only read is through get_stay_information(),
-- which requires an authenticated owner with a CONFIRMED booking.
create table public.property_stay_information (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  wifi_network text,
  wifi_password text,
  breakfast_info text,
  checkin_instructions text,
  directions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes and updated_at triggers
-- ---------------------------------------------------------------------------

create index properties_organization_active_idx
  on public.properties (organization_id, is_active);
create index property_translations_locale_idx on public.property_translations (locale);
create index unit_translations_locale_idx on public.unit_translations (locale);
create index unit_amenities_unit_id_idx on public.unit_amenities (unit_id);
create index property_images_property_id_idx on public.property_images (property_id);

create trigger set_updated_at_on_property_translations
  before update on public.property_translations
  for each row execute function public.set_updated_at();
create trigger set_updated_at_on_unit_translations
  before update on public.unit_translations
  for each row execute function public.set_updated_at();
create trigger set_updated_at_on_unit_images
  before update on public.unit_images
  for each row execute function public.set_updated_at();
create trigger set_updated_at_on_property_images
  before update on public.property_images
  for each row execute function public.set_updated_at();
create trigger set_updated_at_on_property_stay_information
  before update on public.property_stay_information
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Public read model builders (internal helpers, not part of the client API)
-- ---------------------------------------------------------------------------

create function public.build_unit_json(p_unit_id uuid, p_locale text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', u.id,
    'propertyId', u.property_id,
    'name', u.name,
    'slug', u.slug,
    'maxGuests', u.max_guests,
    'nightlyRateMinor', u.nightly_rate_minor,
    'currency', u.currency,
    'summary', coalesce(ut.summary, ''),
    'description', coalesce(ut.description, u.description, ''),
    'amenities', coalesce((
      select jsonb_agg(ua.amenity_code order by ua.sort_order)
        from public.unit_amenities ua
        join public.amenities a on a.code = ua.amenity_code and a.is_public
       where ua.unit_id = u.id
    ), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ui.id,
               'storagePath', ui.storage_path,
               'altText', coalesce(uit.alt_text, '')
             ) order by ui.sort_order)
        from public.unit_images ui
        left join public.unit_image_translations uit
          on uit.image_id = ui.id and uit.locale = p_locale
       where ui.unit_id = u.id
    ), '[]'::jsonb)
  )
  from public.units u
  left join public.unit_translations ut
    on ut.unit_id = u.id and ut.locale = p_locale
  where u.id = p_unit_id;
$$;

create function public.build_property_json(p_property_id uuid, p_locale text)
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

-- Internal helpers: only reachable from the SECURITY DEFINER RPCs below.
revoke execute on function public.build_unit_json(uuid, text) from public, anon, authenticated;
revoke execute on function public.build_property_json(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5a. Public catalog RPC (organization-scoped, server authoritative)
-- ---------------------------------------------------------------------------

create function public.get_catalog(p_organization_slug text, p_locale text default 'es')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'organization', jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug),
        'properties', coalesce(
          jsonb_agg(public.build_property_json(p.id, p_locale) order by p.name),
          '[]'::jsonb
        )
      )
      from public.organizations o
      join public.properties p
        on p.organization_id = o.id and p.is_active
      where o.slug = p_organization_slug
        and o.is_active
      group by o.id, o.name, o.slug
    ),
    jsonb_build_object('organization', null::jsonb, 'properties', '[]'::jsonb)
  );
$$;

create function public.get_unit(
  p_organization_slug text,
  p_unit_id uuid,
  p_locale text default 'es'
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.build_unit_json(u.id, p_locale)
  from public.units u
  join public.properties p on p.id = u.property_id
  join public.organizations o on o.id = p.organization_id
  where u.id = p_unit_id
    and u.is_active
    and p.is_active
    and o.is_active
    and o.slug = p_organization_slug;
$$;

-- ---------------------------------------------------------------------------
-- 5b. Public availability search (shared logic; no divergent client copy)
-- ---------------------------------------------------------------------------

create function public.search_available_units(
  p_organization_slug text,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_locale text default 'es',
  p_unit_id uuid default null
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

-- ---------------------------------------------------------------------------
-- 5c. Private stay information RPC (owner + CONFIRMED only)
-- ---------------------------------------------------------------------------

create function public.get_stay_information(p_booking_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bookingId', b.id,
    'wifiNetwork', psi.wifi_network,
    'wifiPassword', psi.wifi_password,
    'breakfastInfo', psi.breakfast_info,
    'checkinInstructions', psi.checkin_instructions,
    'directions', psi.directions
  )
  from public.bookings b
  join public.units u on u.id = b.unit_id
  join public.property_stay_information psi on psi.property_id = u.property_id
  where b.id = p_booking_id
    and b.guest_profile_id = (select auth.uid())
    and b.status = 'CONFIRMED';
$$;

-- ---------------------------------------------------------------------------
-- 5d. Transactional booking creation (prepared for PostgreSQL, NOT exposed)
-- ---------------------------------------------------------------------------

create function public.create_booking(
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
  v_unit public.units;
  v_property public.properties;
  v_nights integer;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select *
    into v_unit
    from public.units u
   where u.id = p_unit_id;

  if v_unit.id is null then
    raise exception 'unit_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_property
    from public.properties p
   where p.id = v_unit.property_id;

  if not v_unit.is_active or v_property.id is null or not v_property.is_active then
    raise exception 'unit_not_bookable' using errcode = 'P0002';
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
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

  -- Release expired holds for this unit first, so they cannot block a valid claim.
  update public.bookings
     set status = 'CANCELED',
         canceled_at = now(),
         cancellation_reason = 'HOLD_EXPIRED'
   where unit_id = p_unit_id
     and status = 'PENDING_PAYMENT'
     and hold_expires_at <= now();

  v_nights := p_check_out - p_check_in;

  -- The server is authoritative over price and currency. The client supplies neither.
  insert into public.bookings (
    unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, guest_phone, currency,
    nightly_rate_minor, total_amount_minor
  )
  values (
    p_unit_id, v_uid, p_check_in, p_check_out, p_guest_count,
    btrim(p_guest_name), lower(btrim(p_guest_email)),
    nullif(btrim(coalesce(p_guest_phone, '')), ''), v_unit.currency,
    v_unit.nightly_rate_minor, v_unit.nightly_rate_minor * v_nights
  )
  returning * into v_booking;

  return v_booking;
exception
  when exclusion_violation then
    raise exception 'unit_unavailable' using errcode = '23P01';
end;
$$;

comment on function public.create_booking(uuid, date, date, integer, text, text, text) is
  'Transactional booking creation (PENDING_PAYMENT + 5-minute hold). Prepared and tested in PostgreSQL; deliberately NOT granted to anon/authenticated until the payments phase.';

-- ---------------------------------------------------------------------------
-- 6. RLS and minimum-privilege grants
-- ---------------------------------------------------------------------------

alter table public.property_translations enable row level security;
alter table public.unit_translations enable row level security;
alter table public.amenities enable row level security;
alter table public.unit_amenities enable row level security;
alter table public.property_highlights enable row level security;
alter table public.unit_image_translations enable row level security;
alter table public.property_images enable row level security;
alter table public.property_image_translations enable row level security;
alter table public.property_stay_information enable row level security;

-- Replace the pre-public-catalog policies with organization-scoped ones. The originals
-- granted `authenticated` access to any active property/unit regardless of organization.
drop policy "Authenticated users can read active properties" on public.properties;
drop policy "Authenticated users can read active units" on public.units;
drop policy "Authenticated users can read unit images" on public.unit_images;

-- Everyone (anon + authenticated) reads only the active organization.
grant select on table public.organizations to anon, authenticated;
create policy "Public can read the active organization"
  on public.organizations
  for select
  to anon, authenticated
  using (is_active);

-- Active properties of the active organization.
grant select on table public.properties to anon, authenticated;
create policy "Public can read active properties of active organizations"
  on public.properties
  for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.organizations o
       where o.id = properties.organization_id and o.is_active
    )
  );

-- Active units of active properties of the active organization.
grant select on table public.units to anon, authenticated;
create policy "Public can read active units of public properties"
  on public.units
  for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1
        from public.properties p
        join public.organizations o on o.id = p.organization_id
       where p.id = units.property_id and p.is_active and o.is_active
    )
  );

-- Catalog media of active units / properties.
grant select on table public.unit_images to anon, authenticated;
grant select on table public.unit_image_translations to anon, authenticated;
grant select on table public.property_images to anon, authenticated;
grant select on table public.property_image_translations to anon, authenticated;

create policy "Public can read images of active units"
  on public.unit_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.units u
        join public.properties p on p.id = u.property_id
        join public.organizations o on o.id = p.organization_id
       where u.id = unit_images.unit_id and u.is_active and p.is_active and o.is_active
    )
  );

create policy "Public can read unit image translations"
  on public.unit_image_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.unit_images ui
       where ui.id = unit_image_translations.image_id
    )
  );

create policy "Public can read images of active properties"
  on public.property_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.properties p
        join public.organizations o on o.id = p.organization_id
       where p.id = property_images.property_id and p.is_active and o.is_active
    )
  );

create policy "Public can read property image translations"
  on public.property_image_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.property_images pi
       where pi.id = property_image_translations.image_id
    )
  );

-- Localized content of active entities.
grant select on table public.property_translations to anon, authenticated;
grant select on table public.unit_translations to anon, authenticated;

create policy "Public can read translations of active properties"
  on public.property_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.properties p
        join public.organizations o on o.id = p.organization_id
       where p.id = property_translations.property_id and p.is_active and o.is_active
    )
  );

create policy "Public can read translations of active units"
  on public.unit_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.units u
        join public.properties p on p.id = u.property_id
        join public.organizations o on o.id = p.organization_id
       where u.id = unit_translations.unit_id and u.is_active and p.is_active and o.is_active
    )
  );

-- Public amenities / highlights.
grant select on table public.amenities to anon, authenticated;
grant select on table public.unit_amenities to anon, authenticated;
grant select on table public.property_highlights to anon, authenticated;

create policy "Public can read public amenities"
  on public.amenities
  for select
  to anon, authenticated
  using (is_public);

create policy "Public can read amenities of active units"
  on public.unit_amenities
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.units u
        join public.properties p on p.id = u.property_id
        join public.organizations o on o.id = p.organization_id
       where u.id = unit_amenities.unit_id and u.is_active and p.is_active and o.is_active
    )
  );

create policy "Public can read highlights of active properties"
  on public.property_highlights
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.properties p
        join public.organizations o on o.id = p.organization_id
       where p.id = property_highlights.property_id and p.is_active and o.is_active
    )
  );

-- Private stay information: no grants, no policies. RLS makes every direct read empty.
revoke all on table public.property_stay_information from anon, authenticated;
create policy "No direct client access to stay information"
  on public.property_stay_information
  for select
  to anon, authenticated
  using (false);

-- Function grants. Revoke the implicit PUBLIC execute first, then grant the minimum.
revoke execute on function public.get_catalog(text, text) from public, anon, authenticated;
revoke execute on function public.get_unit(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.search_available_units(text, date, date, integer, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.get_stay_information(uuid) from public, anon, authenticated;
revoke execute on function public.create_booking(uuid, date, date, integer, text, text, text)
  from public, anon, authenticated;

grant execute on function public.get_catalog(text, text) to anon, authenticated;
grant execute on function public.get_unit(text, uuid, text) to anon, authenticated;
grant execute on function public.search_available_units(text, date, date, integer, text, uuid)
  to anon, authenticated;
grant execute on function public.get_stay_information(uuid) to authenticated;
grant execute on function public.create_booking(uuid, date, date, integer, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 7. Public-read storage bucket with no client write path
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('catalog-media', 'catalog-media', true)
on conflict (id) do nothing;

-- Anyone may read catalog media; no INSERT/UPDATE/DELETE policy exists for anon or
-- authenticated, so the bucket is read-only to clients. Uploads happen out of band.
drop policy if exists "Public read for catalog media" on storage.objects;
create policy "Public read for catalog media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'catalog-media');

-- ---------------------------------------------------------------------------
-- 8. Profile creation carries the signup display name
-- ---------------------------------------------------------------------------

-- Replaces the initial trigger body with one that also copies the display name from the
-- signup metadata. Clients still cannot choose a different auth.users id; the row is
-- created only as a consequence of a new authenticated user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
