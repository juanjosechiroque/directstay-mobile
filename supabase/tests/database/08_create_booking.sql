-- Transactional booking creation (prepared in PostgreSQL, not exposed to the client):
--   * creates a PENDING_PAYMENT booking with a server-authoritative price and 5-min hold
--   * validates organization/property/unit state, dates, guests and guest data
--   * prevents overlapping inventory claims transactionally
--   * cancels expired pending holds for the unit before inserting
--   * requires authentication; anon/authenticated cannot execute it (see 04)
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

insert into auth.users (id, email) values
  ('a3000000-0000-0000-0000-000000000001', 'creator@example.test');

set local request.jwt.claims to '{"sub":"a3000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- ---- happy path: server computes the price and the hold ----
create temporary table created as
select public.create_booking(
  '33333333-3333-3333-3333-333333333301',
  date '2027-05-01', date '2027-05-04', 2, 'Guest Name', 'GUEST@Example.Test', null
) as booking;

select is((select (booking).status::text from created), 'PENDING_PAYMENT',
  'create_booking starts a booking in PENDING_PAYMENT');
select is((select (booking).total_amount_minor from created), 36000::bigint,
  'create_booking computes the total from the server nightly rate x nights');
select is((select (booking).nightly_rate_minor from created), 12000::bigint,
  'create_booking snapshots the server nightly rate');
select is((select (booking).guest_profile_id from created),
  'a3000000-0000-0000-0000-000000000001'::uuid,
  'create_booking attributes the booking to auth.uid()');
select is((select (booking).guest_email from created), 'guest@example.test',
  'create_booking normalizes the guest email');
select is(
  (select (booking).hold_expires_at - (booking).created_at from created),
  interval '5 minutes',
  'create_booking retains inventory for exactly five minutes');
select is((select (booking).confirmed_at from created), null,
  'create_booking never confirms a booking from the client');

-- ---- overlap is rejected transactionally ----
select throws_ok($$
  select public.create_booking(
    '33333333-3333-3333-3333-333333333301',
    date '2027-05-02', date '2027-05-05', 2, 'Guest', 'g@example.test', null)
$$, '23P01', null, 'an overlapping create_booking is rejected by the exclusion constraint');

-- ---- validation ----
select throws_ok($$
  select public.create_booking(
    '33333333-3333-3333-3333-333333333301',
    date '2027-05-10', date '2027-05-12', 3, 'Guest', 'g@example.test', null)
$$, '22023', null, 'a guest count over the unit capacity is rejected');
select throws_ok($$
  select public.create_booking(
    '33333333-3333-3333-3333-333333333301',
    date '2027-05-12', date '2027-05-10', 2, 'Guest', 'g@example.test', null)
$$, '22007', null, 'an inverted date range is rejected');
select throws_ok($$
  select public.create_booking(
    '33333333-3333-3333-3333-333333333301',
    date '2027-05-10', date '2027-05-12', 2, '   ', 'g@example.test', null)
$$, '22023', null, 'a blank guest name is rejected');

-- ---- expired pending holds are released before inserting ----
insert into public.bookings (
  unit_id, guest_profile_id, status, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor,
  created_at, hold_expires_at
)
values (
  '33333333-3333-3333-3333-333333333302', 'a3000000-0000-0000-0000-000000000001',
  'PENDING_PAYMENT', date '2027-09-01', date '2027-09-03', 2, 'Guest', 'g@example.test',
  'USD', 18000, 36000, now() - interval '10 minutes', now() - interval '5 minutes');

select lives_ok($$
  select public.create_booking(
    '33333333-3333-3333-3333-333333333302',
    date '2027-09-01', date '2027-09-03', 2, 'Guest', 'g@example.test', null)
$$, 'create_booking releases an expired hold and admits a valid claim');
select is(
  (select status::text from public.bookings
    where unit_id = '33333333-3333-3333-3333-333333333302'
      and check_in = date '2027-09-01'),
  'CANCELED',
  'the expired pending booking is canceled');
select is(
  (select cancellation_reason::text from public.bookings
    where unit_id = '33333333-3333-3333-3333-333333333302'
      and check_in = date '2027-09-01'),
  'HOLD_EXPIRED',
  'the expired hold is canceled with HOLD_EXPIRED');

-- ---- requires authentication ----
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$
  select public.create_booking(
    '33333333-3333-3333-3333-333333333301',
    date '2027-10-01', date '2027-10-03', 2, 'Guest', 'g@example.test', null)
$$, '28000', null, 'create_booking refuses anonymous callers');
set local request.jwt.claims to '{"sub":"a3000000-0000-0000-0000-000000000001","role":"authenticated"}';

select * from finish();
rollback;
