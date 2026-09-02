-- Seed data invariants (supabase/seed.sql applied by `supabase db reset`):
--   * Ayni Hospitality and Ayni Mountain Cabins exist
--   * the demo property has exactly the units Killa, Inti, Wayra, Sumaq
--   * currency, timezone, check-in/out times and prices satisfy the frozen invariants
--   * the seed creates no bookings or payments
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

select is(
  (select count(*)::int from public.organizations where name = 'Ayni Hospitality'),
  1, 'seed: the Ayni Hospitality organization exists');

select is(
  (select count(*)::int
     from public.properties p
     join public.organizations o on o.id = p.organization_id
    where p.name = 'Ayni Mountain Cabins' and o.name = 'Ayni Hospitality'),
  1, 'seed: the Ayni Mountain Cabins property exists under Ayni Hospitality');

-- frozen demo property config
select is(
  (select timezone from public.properties where name = 'Ayni Mountain Cabins'),
  'America/Lima', 'seed: demo property timezone is America/Lima');
select is(
  (select check_in_time from public.properties where name = 'Ayni Mountain Cabins'),
  time '15:00', 'seed: demo property check-in time is 15:00');
select is(
  (select check_out_time from public.properties where name = 'Ayni Mountain Cabins'),
  time '12:00', 'seed: demo property check-out time is 12:00');
select is(
  (select currency from public.properties where name = 'Ayni Mountain Cabins'),
  'USD', 'seed: demo property currency is USD');

-- exactly the four demo units
select set_eq(
  $$ select u.name::text
       from public.units u
       join public.properties p on p.id = u.property_id
      where p.name = 'Ayni Mountain Cabins' $$,
  array['Killa', 'Inti', 'Wayra', 'Sumaq'],
  'seed: the demo property has exactly the units Killa, Inti, Wayra and Sumaq');
select is(
  (select count(*)::int from public.units),
  4, 'seed: there are no units beyond the demo four');

-- prices: positive whole integers of USD minor units
select is(
  (select count(*)::int from public.units where currency <> 'USD'),
  0, 'seed: every demo unit is priced in USD');
select is(
  (select count(*)::int from public.units where nightly_rate_minor <= 0),
  0, 'seed: every nightly rate is a positive amount of minor units');
select is(
  (select count(*)::int from public.units where nightly_rate_minor <> trunc(nightly_rate_minor)),
  0, 'seed: nightly rates are whole integers (no fractional minor units)');
select col_type_is('public'::name, 'units'::name, 'nightly_rate_minor'::name, 'bigint',
  'seed: nightly_rate_minor is stored as bigint');

-- no transactional data from the seed
select is(
  (select count(*)::int from public.bookings) + (select count(*)::int from public.payments),
  0, 'seed: no bookings or payments are created');

select * from finish();
rollback;
