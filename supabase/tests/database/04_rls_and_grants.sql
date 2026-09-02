-- RLS and grants seen from the client roles:
--   * anon cannot read or write any public table
--   * authenticated can only read active properties / units
--   * images of inactive units are not visible
--   * a user can read and update only their own profile
--   * a guest can read only their own bookings
--   * payments / organizations / availability_blocks are not client-accessible
--   * authenticated cannot INSERT or UPDATE bookings directly (RPC-only)
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

-- one image on an active seed unit (Killa) and one on the inactive unit
insert into public.unit_images (id, unit_id, storage_path) values
  ('d0000000-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333301', 'ayni/killa/1.jpg'),
  ('d0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000002', 'ayni/hidden/1.jpg');

-- one booking per guest
insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
values
  ('33333333-3333-3333-3333-333333333301', 'c0000000-0000-0000-0000-000000000001',
   date '2026-10-10', date '2026-10-12', 2, 'Guest One', 'g1@example.test', 'USD', 12000, 24000),
  ('33333333-3333-3333-3333-333333333302', 'c0000000-0000-0000-0000-000000000002',
   date '2026-10-10', date '2026-10-12', 2, 'Guest Two', 'g2@example.test', 'USD', 12000, 24000);

-- ---- anon: no access at all ----
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok($$ select count(*) from public.organizations $$, '42501', null, 'anon cannot read organizations');
select throws_ok($$ select count(*) from public.properties $$, '42501', null, 'anon cannot read properties');
select throws_ok($$ select count(*) from public.units $$, '42501', null, 'anon cannot read units');
select throws_ok($$ select count(*) from public.unit_images $$, '42501', null, 'anon cannot read unit_images');
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select count(*) from public.bookings $$, '42501', null, 'anon cannot read bookings');
select throws_ok($$ select count(*) from public.payments $$, '42501', null, 'anon cannot read payments');
select throws_ok($$ select count(*) from public.availability_blocks $$, '42501', null, 'anon cannot read availability_blocks');
select throws_ok($$
  insert into public.properties (organization_id, name, slug, timezone, check_in_time, check_out_time, currency)
  values ('11111111-1111-1111-1111-111111111111', 'x', 'x-anon', 'America/Lima', '15:00', '12:00', 'USD')
$$, '42501', null, 'anon cannot write properties');

reset role;

-- ---- authenticated: read-only catalog, active rows only ----
set local role authenticated;
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is( (select count(*)::int from public.properties), 1, 'authenticated sees only the active seed property');
select is( (select count(*)::int from public.units), 4, 'authenticated sees only the four active seed units');
select is( (select bool_and(is_active) from public.properties), true, 'every property visible to authenticated is active');
select is( (select bool_and(is_active) from public.units), true, 'every unit visible to authenticated is active');

select is(
  (select count(*)::int from public.unit_images where storage_path = 'ayni/killa/1.jpg'),
  1, 'an image of an active unit is visible');
select is_empty(
  $$ select 1 from public.unit_images where storage_path = 'ayni/hidden/1.jpg' $$,
  'an image of an inactive unit is not visible');

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
select lives_ok(
  $$ update public.profiles set display_name = 'Intruso' where id = 'c0000000-0000-0000-0000-000000000002' $$,
  'a cross-user profile update runs without error but matches no rows under RLS');

-- own bookings only
select is( (select count(*)::int from public.bookings), 1, 'a guest sees only their own booking');
select is(
  (select guest_profile_id from public.bookings),
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'the visible booking belongs to the caller');

-- payments / organizations / availability_blocks: not client-accessible
select throws_ok($$ select count(*) from public.payments $$, '42501', null, 'authenticated cannot read payments');
select throws_ok($$ select count(*) from public.organizations $$, '42501', null, 'authenticated cannot read organizations');
select throws_ok($$ select count(*) from public.availability_blocks $$, '42501', null, 'authenticated cannot read availability_blocks');

-- bookings are RPC-only for the client: no direct INSERT / UPDATE
select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'c0000000-0000-0000-0000-000000000001',
    date '2027-01-10', date '2027-01-12', 2, 'X', 'x@example.test', 'USD', 12000, 24000)
$$, '42501', null, 'authenticated cannot INSERT bookings directly');
select throws_ok($$
  update public.bookings set guest_count = 9 where guest_profile_id = 'c0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'authenticated cannot UPDATE bookings directly');

reset role;

-- ---- the cross-user update above must not have changed anything ----
select is(
  (select display_name from public.profiles where id = 'c0000000-0000-0000-0000-000000000002'),
  null,
  'guest two''s profile was untouched by guest one''s cross-user update attempt');

select * from finish();
rollback;
