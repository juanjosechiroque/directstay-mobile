-- RLS and grants seen from the client roles after the public-catalog migration:
--   * anon can read only the active organization, its active properties/units, their
--     localized public content, amenities, highlights and catalog media
--   * anon cannot read profiles, bookings, payments, availability_blocks or private stay
--     information, and cannot write anything
--   * authenticated is the same for the catalog, plus owner-only profile/bookings
--   * the public RPCs work for anon; the private stay RPC needs an owner + CONFIRMED
--   * create_booking is not callable by anon or authenticated
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

-- ---- fixtures ----
insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-000000000001', 'rls-guest-1@example.test'),
  ('c0000000-0000-0000-0000-000000000002', 'rls-guest-2@example.test');

-- an inactive property and an inactive unit under the active demo property
insert into public.properties (id, organization_id, name, slug, timezone, check_in_time, check_out_time, currency, is_active)
values ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
  'Hidden Property', 'hidden-property', 'America/Lima', '15:00', '12:00', 'USD', false);
insert into public.units (id, property_id, name, slug, max_guests, nightly_rate_minor, currency, is_active)
values ('d0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
  'Hidden Unit', 'hidden-unit', 2, 10000, 'USD', false);

-- one image on an active seed unit (Killa) and one on the inactive unit. Killa already has
-- seed images at sort_order 0 and 1, so this one uses 2 to avoid the unique constraint.
insert into public.unit_images (id, unit_id, storage_path, sort_order) values
  ('d0000000-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333301', 'ayni/killa/1.jpg', 2),
  ('d0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000002', 'ayni/hidden/1.jpg', 0);

-- one booking per guest; guest 1 owns a CONFIRMED booking for the private stay test
insert into public.bookings (
  id, unit_id, guest_profile_id, status, confirmed_at, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor
)
values
  ('e0000000-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333301', 'c0000000-0000-0000-0000-000000000001',
   'CONFIRMED', now(), date '2026-10-10', date '2026-10-12', 2, 'Guest One', 'g1@example.test',
   'USD', 12000, 24000),
  ('e0000000-0000-0000-0000-000000000002',
   '33333333-3333-3333-3333-333333333302', 'c0000000-0000-0000-0000-000000000002',
   'CONFIRMED', now(), date '2026-10-10', date '2026-10-12', 2, 'Guest Two', 'g2@example.test',
   'USD', 12000, 24000);

-- ---- anon: public catalog only ----
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select is( (select count(*)::int from public.organizations), 1, 'anon sees only the active organization');
select is( (select count(*)::int from public.properties), 2, 'anon sees only the active seed properties');
select is( (select count(*)::int from public.units), 6, 'anon sees only the active seed units');
select is(
  (select count(*)::int from public.unit_images where storage_path = 'ayni/killa/1.jpg'),
  1, 'anon sees images of active units');
select is_empty(
  $$ select 1 from public.unit_images where storage_path = 'ayni/hidden/1.jpg' $$,
  'anon cannot see images of inactive units');
select cmp_ok(
  (select count(*)::int from public.unit_images), '>', 0,
  'anon can see some catalog media');

select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select count(*) from public.bookings $$, '42501', null, 'anon cannot read bookings');
select throws_ok($$ select count(*) from public.payments $$, '42501', null, 'anon cannot read payments');
select throws_ok($$ select count(*) from public.availability_blocks $$, '42501', null, 'anon cannot read availability_blocks');
select throws_ok($$ select count(*) from public.property_stay_information $$, '42501', null, 'anon cannot read private stay information');
select throws_ok($$
  insert into public.properties (organization_id, name, slug, timezone, check_in_time, check_out_time, currency)
  values ('11111111-1111-1111-1111-111111111111', 'x', 'x-anon', 'America/Lima', '15:00', '12:00', 'USD')
$$, '42501', null, 'anon cannot write properties');

-- public RPCs
select cmp_ok(
  jsonb_array_length((select public.get_catalog('ayni-hospitality', 'es')) -> 'properties'),
  '=', 2,
  'anon can read the catalog for the configured organization');
select is(
  jsonb_array_length((select public.get_catalog('does-not-exist', 'es')) -> 'properties'),
  0,
  'the catalog is scoped to the requested active organization');
select cmp_ok(
  (select count(*)::int from public.search_available_units('ayni-hospitality', date '2028-02-01', date '2028-02-04', 2, 'es', null)),
  '>', 0,
  'anon can search availability through the public RPC');
select throws_ok($$
  select * from public.search_available_units('ayni-hospitality', date '2028-02-04', date '2028-02-01', 2, 'es', null)
$$, '22007', null, 'the availability RPC rejects an inverted date range');
select throws_ok($$
  select * from public.get_stay_information('e0000000-0000-0000-0000-000000000001')
$$, '42501', null, 'anon cannot execute the private stay RPC');

-- create_booking must not be callable from anon
select throws_ok($$
  select public.create_booking('33333333-3333-3333-3333-333333333301', date '2028-02-01', date '2028-02-04', 2, 'Guest', 'g@example.test', null)
$$, '42501', null, 'anon cannot execute create_booking');

reset role;

-- ---- authenticated: public catalog + owner-only private reads ----
set local role authenticated;
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is( (select count(*)::int from public.properties), 2, 'authenticated sees only the active seed properties');
select is( (select count(*)::int from public.units), 6, 'authenticated sees only the active seed units');
select is( (select bool_and(is_active) from public.properties), true, 'every visible property is active');
select is( (select bool_and(is_active) from public.units), true, 'every visible unit is active');

-- own profile only
select is( (select count(*)::int from public.profiles), 1, 'authenticated sees exactly one profile row');
select is(
  (select id from public.profiles),
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'the only visible profile is the caller''s own');
select is_empty(
  $$ select 1 from public.profiles where id = 'c0000000-0000-0000-0000-000000000002' $$,
  'authenticated cannot read another user''s profile');
select lives_ok(
  $$ update public.profiles set display_name = 'Yo Mismo' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'authenticated can update its own profile');

-- own bookings only
select is( (select count(*)::int from public.bookings), 1, 'a guest sees only their own booking');
select is(
  (select guest_profile_id from public.bookings),
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'the visible booking belongs to the caller');

-- private stay information only for the owner with CONFIRMED
select isnt(
  public.get_stay_information('e0000000-0000-0000-0000-000000000001') ->> 'wifiNetwork',
  null,
  'the owner can read stay information for a confirmed booking');
select is(
  public.get_stay_information('e0000000-0000-0000-0000-000000000002'),
  null,
  'a guest cannot read another guest''s stay information');

-- payments / availability_blocks / stay information are not client-accessible
select throws_ok($$ select count(*) from public.payments $$, '42501', null, 'authenticated cannot read payments');
select throws_ok($$ select count(*) from public.availability_blocks $$, '42501', null, 'authenticated cannot read availability_blocks');
select throws_ok($$ select count(*) from public.property_stay_information $$, '42501', null, 'authenticated cannot read stay information directly');

-- bookings are RPC-only for the client: no direct INSERT / UPDATE, no create_booking
select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'c0000000-0000-0000-0000-000000000001',
    date '2027-01-10', date '2027-01-12', 2, 'X', 'x@example.test', 'USD', 12000, 24000)
$$, '42501', null, 'authenticated cannot INSERT bookings directly');
select throws_ok($$
  update public.bookings set guest_count = 9 where guest_profile_id = 'c0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'authenticated cannot UPDATE bookings directly');
select throws_ok($$
  select public.create_booking('33333333-3333-3333-3333-333333333301', date '2028-02-01', date '2028-02-04', 2, 'Guest', 'g@example.test', null)
$$, '42501', null, 'authenticated cannot execute create_booking');

reset role;

-- ---- the cross-user update above must not have changed anything ----
select is(
  (select display_name from public.profiles where id = 'c0000000-0000-0000-0000-000000000002'),
  null,
  'guest two''s profile was untouched by guest one''s cross-user update attempt');

select * from finish();
rollback;
