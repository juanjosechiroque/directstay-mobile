-- Seed data invariants (supabase/seed.sql applied by `supabase db reset`):
--   * Ayni Hospitality (slug ayni-hospitality) exists and is active
--   * two active properties: Ayni Mountain Cabins and Ayni Cusco
--   * Mountain Cabins has exactly Killa, Inti, Wayra, Sumaq; Cusco has Sisa and Illapa
--   * every unit is priced in positive USD integer minor units
--   * localized content exists for es and en
--   * catalog media claims no unverified license (license is null, note present)
--   * private stay information exists for the properties
--   * an availability block provides a reproducible "unavailable" scenario
--   * the seed creates no bookings or payments
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

select is(
  (select slug from public.organizations where name = 'Ayni Hospitality'),
  'ayni-hospitality', 'seed: the organization has the stable slug');
select is(
  (select is_active from public.organizations where name = 'Ayni Hospitality'),
  true, 'seed: the organization is active');

select is(
  (select count(*)::int from public.properties where is_active),
  2, 'seed: there are two active properties');

select is(
  (select count(*)::int
     from public.properties p
     join public.organizations o on o.id = p.organization_id
    where p.name = 'Ayni Mountain Cabins' and o.name = 'Ayni Hospitality'),
  1, 'seed: Ayni Mountain Cabins exists under Ayni Hospitality');
select is(
  (select count(*)::int from public.properties where name = 'Ayni Cusco'),
  1, 'seed: Ayni Cusco exists');

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

-- units per property
select set_eq(
  $$ select u.name::text
       from public.units u
       join public.properties p on p.id = u.property_id
      where p.name = 'Ayni Mountain Cabins' $$,
  array['Killa', 'Inti', 'Wayra', 'Sumaq'],
  'seed: Mountain Cabins has exactly Killa, Inti, Wayra and Sumaq');
select set_eq(
  $$ select u.name::text
       from public.units u
       join public.properties p on p.id = u.property_id
      where p.name = 'Ayni Cusco' $$,
  array['Sisa', 'Illapa'],
  'seed: Ayni Cusco has exactly Sisa and Illapa');
select is(
  (select count(*)::int from public.units),
  6, 'seed: there are no units beyond the demo six');

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

-- localized content for every active property and unit
select is(
  (select count(*)::int
     from public.properties p
    where not exists (select 1 from public.property_translations t where t.property_id = p.id and t.locale = 'es')
       or not exists (select 1 from public.property_translations t where t.property_id = p.id and t.locale = 'en')),
  0, 'seed: every property has es and en translations');
select is(
  (select count(*)::int
     from public.units u
    where not exists (select 1 from public.unit_translations t where t.unit_id = u.id and t.locale = 'es')),
  0, 'seed: every unit has a Spanish translation');

-- catalog media never claims a license without full provenance, and every image still
-- pending a licensed asset documents that explicitly
select is(
  (select count(*)::int from public.unit_images
    where license is not null
      and (source_url is null or author is null or attribution_text is null
           or license_verified_at is null)),
  0, 'seed: every licensed unit image has full provenance');
select is(
  (select count(*)::int from public.property_images
    where license is not null
      and (source_url is null or author is null or attribution_text is null
           or license_verified_at is null)),
  0, 'seed: every licensed property image has full provenance');
select is(
  (select count(*)::int
     from public.unit_images
    where license is null
      and (verification_note is null or btrim(verification_note) = '')),
  0, 'seed: every unlicensed placeholder image documents the pending license work');

-- private stay information exists and is not public
select is(
  (select count(*)::int from public.property_stay_information),
  2, 'seed: both properties have private stay information');

-- reproducible unavailable scenario
select is(
  (select count(*)::int from public.availability_blocks where reason = 'DEMO_MAINTENANCE'),
  1, 'seed: one maintenance block provides an unavailable scenario');

-- no transactional data from the seed
select is(
  (select count(*)::int from public.bookings) + (select count(*)::int from public.payments),
  0, 'seed: no bookings or payments are created');

select * from finish();
rollback;
