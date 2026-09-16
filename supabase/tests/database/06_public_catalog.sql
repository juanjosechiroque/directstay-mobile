-- Public catalog and availability RPCs:
--   * search is scoped to the active organization
--   * capacity, date validation and locale localization
--   * availability considers bookings and availability blocks
--   * the price snapshot is server-computed in integer minor units
--   * responses never contain private stay fields
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

-- ---- organization scoping ----
select is(
  (select count(*)::int from public.search_available_units('unknown-org', date '2027-03-01', date '2027-03-04', 2, 'es', null)),
  0,
  'availability is scoped to a known active organization');

select is(
  jsonb_array_length((select public.get_catalog('unknown-org', 'es')) -> 'properties'),
  0,
  'the catalog returns nothing for an unknown organization');

-- ---- capacity filter ----
select is(
  (select count(*)::int from public.search_available_units('ayni-hospitality', date '2027-03-01', date '2027-03-04', 6, 'es', null)),
  1,
  'only the 6-guest unit matches a 6-guest search');

-- ---- date validation ----
select throws_ok($$
  select * from public.search_available_units('ayni-hospitality', date '2027-03-04', date '2027-03-01', 2, 'es', null)
$$, '22007', null, 'an inverted date range is rejected');
select throws_ok($$
  select * from public.search_available_units('ayni-hospitality', date '2027-03-01', date '2027-03-04', 0, 'es', null)
$$, '22023', null, 'a non-positive guest count is rejected');

-- ---- server-computed integer price ----
select is(
  (select (result ->> 'totalAmountMinor')::bigint
     from public.search_available_units('ayni-hospitality', date '2027-03-01', date '2027-03-04', 2, 'es', '33333333-3333-3333-3333-333333333301') as result),
  36000,
  'the price snapshot is nightly rate x nights in minor units (12000 x 3)');
select is(
  (select (result ->> 'nights')::int
     from public.search_available_units('ayni-hospitality', date '2027-03-01', date '2027-03-04', 2, 'es', '33333333-3333-3333-3333-333333333301') as result),
  3,
  'the RPC returns the number of nights');

-- ---- locale localization ----
select isnt(
  (select public.get_catalog('ayni-hospitality', 'es') -> 'properties' -> 1 ->> 'description'),
  (select public.get_catalog('ayni-hospitality', 'en') -> 'properties' -> 1 ->> 'description'),
  'property copy is localized through the requested locale');

-- ---- availability considers a seeded maintenance block ----
select is(
  (select count(*)::int
     from public.search_available_units('ayni-hospitality', date '2026-12-24', date '2026-12-26', 2, 'es', '33333333-3333-3333-3333-333333333305')),
  0,
  'a unit blocked for maintenance is not available');

-- ---- availability considers an inventory-blocking booking ----
insert into auth.users (id, email) values ('f0000000-0000-0000-0000-000000000001', 'catalog-guest@example.test');
insert into public.bookings (
  unit_id, guest_profile_id, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor
)
values (
  '33333333-3333-3333-3333-333333333301', 'f0000000-0000-0000-0000-000000000001',
  date '2027-04-10', date '2027-04-13', 2, 'Guest', 'g@example.test', 'USD', 12000, 36000);

select is(
  (select count(*)::int
     from public.search_available_units('ayni-hospitality', date '2027-04-11', date '2027-04-12', 2, 'es', '33333333-3333-3333-3333-333333333301')),
  0,
  'an overlapping pending booking blocks availability');
select is(
  (select count(*)::int
     from public.search_available_units('ayni-hospitality', date '2027-04-13', date '2027-04-15', 2, 'es', '33333333-3333-3333-3333-333333333301')),
  1,
  'same-day turnover after the booking is still available');

-- ---- public responses never expose private stay data ----
select ok(
  not (((select result from public.search_available_units('ayni-hospitality', date '2027-03-01', date '2027-03-04', 2, 'es', '33333333-3333-3333-3333-333333333301') as result) -> 'unit') ? 'wifiPassword'),
  'search results never contain private stay fields');
select ok(
  not ((select public.get_unit('ayni-hospitality', '33333333-3333-3333-3333-333333333301', 'es')) ? 'wifiNetwork'),
  'unit detail never contains private stay fields');

select * from finish();
rollback;
