-- Catalog activation, selected-organization booking checks, block boundaries and atomic
-- rejection. The independent-connection races live in tests/concurrency/inventory-races.sh.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email) values
 ('aa000000-0000-0000-0000-000000000001', 'inventory-owner@example.test'),
 ('aa000000-0000-0000-0000-000000000002', 'inventory-other@example.test');

-- Active selected organization is visible and usable; inactive selected organization
-- disappears from catalog, unit detail, availability and writes.
select is(jsonb_array_length(public.get_catalog('ayni-hospitality','es')->'properties') > 0, true,
  'active selected organization lists active properties');
select is((public.get_unit('ayni-hospitality','33333333-3333-3333-3333-333333333301','es')->>'id')::uuid,
  '33333333-3333-3333-3333-333333333301'::uuid, 'active owned unit detail is available');

update public.organizations set is_active = false where slug = 'ayni-hospitality';
select is(jsonb_array_length(public.get_catalog('ayni-hospitality','es')->'properties'), 0,
  'inactive organization has no catalog properties');
select is(public.get_unit('ayni-hospitality','33333333-3333-3333-3333-333333333301','es'), null::jsonb,
  'inactive organization hides unit detail');
select is((select count(*)::int from public.search_available_units('ayni-hospitality', date '2032-01-01', date '2032-01-03', 2, 'es', null)), 0,
  'inactive organization is omitted from availability');
set local role authenticated;
set local request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.create_booking('ayni-hospitality','33333333-3333-3333-3333-333333333301', date '2032-01-01', date '2032-01-03', 2, 'A','a@example.test',null) $$,
  'P0002','organization_not_bookable','inactive organization cannot be booked');
reset role;
update public.organizations set is_active = true where slug = 'ayni-hospitality';

insert into public.organizations (id, name, slug, is_active) values
 ('aa000000-0000-0000-0000-000000000010','Other brand','other-brand',true);
insert into public.properties (id, organization_id, name, slug, timezone, check_in_time, check_out_time, currency, is_active) values
 ('aa000000-0000-0000-0000-000000000011','aa000000-0000-0000-0000-000000000010','Other property','other-property','America/Lima','15:00','11:00','USD',true);
insert into public.units (id, property_id, name, slug, max_guests, nightly_rate_minor, currency, is_active) values
 ('aa000000-0000-0000-0000-000000000012','aa000000-0000-0000-0000-000000000011','Other unit','other-unit',4,10000,'USD',true);

select is((select count(*)::int from public.search_available_units('ayni-hospitality', date '2032-02-01', date '2032-02-03', 2, 'es', 'aa000000-0000-0000-0000-000000000012')), 0,
  'selected organization cannot quote a unit from another organization');
select is(public.get_unit('ayni-hospitality','aa000000-0000-0000-0000-000000000012','es'), null::jsonb,
  'selected organization cannot read other organization unit detail');

-- For each activation failure check all public surfaces and the write boundary.
update public.properties set is_active = false where id = '22222222-2222-2222-2222-222222222222';
select is((select count(*)::int from public.search_available_units('ayni-hospitality', date '2032-03-01', date '2032-03-03', 2, 'es', '33333333-3333-3333-3333-333333333301')), 0,
  'inactive property is excluded from availability');
select is(jsonb_array_length(public.get_catalog('ayni-hospitality','es')->'properties'), 1,
  'inactive property is excluded from the catalog');
select is(public.get_unit('ayni-hospitality','33333333-3333-3333-3333-333333333301','es'), null::jsonb,
  'inactive property hides its unit detail');
set local role authenticated;
set local request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.create_booking('ayni-hospitality','33333333-3333-3333-3333-333333333301', date '2032-03-01', date '2032-03-03', 2, 'A','a@example.test',null) $$,
  'P0002','unit_not_bookable','inactive property cannot be booked');
reset role;
update public.properties set is_active = true where id = '22222222-2222-2222-2222-222222222222';

update public.units set is_active = false where id = '33333333-3333-3333-3333-333333333301';
select is((select count(*)::int from public.search_available_units('ayni-hospitality', date '2032-04-01', date '2032-04-03', 2, 'es', '33333333-3333-3333-3333-333333333301')), 0,
  'inactive unit is excluded from availability');
select is(public.get_unit('ayni-hospitality','33333333-3333-3333-3333-333333333301','es'), null::jsonb,
  'inactive unit detail is unavailable');
select ok(not exists (
  select 1 from jsonb_array_elements(public.get_catalog('ayni-hospitality','es')->'properties') p,
       jsonb_array_elements(p->'units') u where u->>'id'='33333333-3333-3333-3333-333333333301'
), 'inactive unit is excluded from catalog property units');
set local role authenticated;
set local request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.create_booking('ayni-hospitality','33333333-3333-3333-3333-333333333301', date '2032-04-01', date '2032-04-03', 2, 'A','a@example.test',null) $$,
  'P0002','unit_not_bookable','inactive unit cannot be booked');
reset role;
update public.units set is_active = true where id = '33333333-3333-3333-3333-333333333301';

-- Selected organization must match unit ownership. Also verify the alternate slug must be
-- active and that failed attempts have no persistent booking side effects.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.create_booking('other-brand','33333333-3333-3333-3333-333333333301', date '2032-05-01', date '2032-05-03', 2, 'A','a@example.test',null) $$,
  'P0002','unit_not_bookable','unit from another organization is rejected');
select throws_ok($$ select public.create_booking('unknown-brand','aa000000-0000-0000-0000-000000000012', date '2032-05-01', date '2032-05-03', 2, 'A','a@example.test',null) $$,
  'P0002','organization_not_bookable','unknown or inactive selected organization is rejected');
select is((select count(*)::int from public.bookings where guest_profile_id='aa000000-0000-0000-0000-000000000001'), 0,
  'organization and activation rejections persist no booking rows');

-- Both RPC signatures are scoped and preserve optional special_requests.
create temporary table base_signature as select public.create_booking(
 'ayni-hospitality','33333333-3333-3333-3333-333333333301',date '2032-06-01',date '2032-06-03',2,'A','a@example.test',null) as b;
select is((select (b).status::text from base_signature),'PENDING_PAYMENT','base signature creates a server-held booking');
create temporary table special_signature as select public.create_booking(
 'ayni-hospitality','33333333-3333-3333-3333-333333333302',date '2032-06-01',date '2032-06-03',2,'A','a@example.test',null,'Late arrival') as b;
select is((select (b).special_requests from special_signature),'Late arrival','special_requests signature persists request');
reset role;

-- A block over a previous hold rejects the new booking without canceling that hold.
set local request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","role":"authenticated"}';
insert into public.availability_blocks (unit_id, check_in, check_out, reason)
 values ('33333333-3333-3333-3333-333333333303', date '2032-07-01', date '2032-07-04', 'TEST_BLOCK');
set local role authenticated;
create temporary table prior_hold as select public.create_booking(
 'ayni-hospitality','33333333-3333-3333-3333-333333333301',date '2032-07-01',date '2032-07-03',2,'B','b@example.test',null) as b;
select throws_ok($$ select public.create_booking('ayni-hospitality','33333333-3333-3333-3333-333333333303', date '2032-07-02', date '2032-07-03', 2, 'B','b@example.test',null) $$,
  '23P01','unit_unavailable','partial availability-block overlap rejects booking');
select throws_ok($$ select public.create_booking('ayni-hospitality','33333333-3333-3333-3333-333333333303', date '2032-07-01', date '2032-07-04', 2, 'B','b@example.test',null) $$,
  '23P01','unit_unavailable','total availability-block overlap rejects booking');
select is((select status::text from public.bookings where id=(select (b).id from prior_hold)),'PENDING_PAYMENT',
  'rejected booking leaves the guest previous pending hold unchanged');
select is((select count(*)::int from public.bookings where unit_id='33333333-3333-3333-3333-333333333303' and check_in=date '2032-07-02'),0,
  'rejected block-overlap attempts persist no new booking');

-- Adjacent intervals are allowed: the block's end date is excluded.
create temporary table adjacent as select public.create_booking(
 'ayni-hospitality','33333333-3333-3333-3333-333333333303',date '2032-07-04',date '2032-07-06',2,'B','b@example.test',null) as b;
select is((select (b).status::text from adjacent),'PENDING_PAYMENT','a stay starting when the block ends is allowed');

-- Active property/unit catalog list behavior is checked directly through get_catalog too.
select is(jsonb_array_length(public.get_catalog('ayni-hospitality','es')->'properties') > 0, true,
  'active catalog returns properties after state restoration');
reset role;
select * from finish();
rollback;
