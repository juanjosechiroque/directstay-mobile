-- Guest checkout through authenticated RPCs. All changes roll back after pgTAP.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, email) values
  ('a5000000-0000-0000-0000-000000000001', 'demo-owner@example.test'),
  ('a5000000-0000-0000-0000-000000000002', 'demo-other@example.test');

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select public.create_booking('33333333-3333-3333-3333-333333333301', date '2028-05-01', date '2028-05-03', 2, 'Guest', 'guest@example.test', null) $$,
  '42501', null, 'anon cannot create a booking');
select throws_ok($$ select public.confirm_demo_payment('a5000000-0000-0000-0000-000000000099') $$,
  '42501', null, 'anon cannot confirm demo payment');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
create temporary table demo_first as
  select public.create_booking('33333333-3333-3333-3333-333333333301',
    date '2028-05-01', date '2028-05-03', 2, 'Guest', 'guest@example.test', null) as booking;
select is((select (booking).total_amount_minor from demo_first), 24000::bigint,
  'the server computes the total from its unit rate');
select throws_ok($$ select public.create_booking('33333333-3333-3333-3333-333333333301',
  ((now() at time zone 'America/Lima')::date - 1),
  ((now() at time zone 'America/Lima')::date + 1), 2, 'Guest', 'guest@example.test', null) $$,
  '22007', 'invalid_date_range', 'past check-in is rejected');

create temporary table demo_second as
  select public.create_booking('33333333-3333-3333-3333-333333333302',
    date '2028-06-01', date '2028-06-03', 2, 'Guest', 'guest@example.test', null) as booking;
select is((select status::text from public.bookings where id = (select (booking).id from demo_first)),
  'CANCELED', 'the previous pending booking is canceled');
select is((select cancellation_reason::text from public.bookings where id = (select (booking).id from demo_first)),
  'SYSTEM', 'replaced pending booking has SYSTEM reason');
select is((select count(*)::int from public.bookings where guest_profile_id = 'a5000000-0000-0000-0000-000000000001' and status = 'PENDING_PAYMENT'),
  1, 'only one pending booking remains for this guest');

set local request.jwt.claims to '{"sub":"a5000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}';
create temporary table demo_freed as
  select public.create_booking('33333333-3333-3333-3333-333333333301',
    date '2028-05-01', date '2028-05-03', 2, 'Other', 'other@example.test', null) as booking;
select ok((select (booking).id is not null from demo_freed), 'the canceled booking released inventory');
select throws_ok($$ select public.create_booking('33333333-3333-3333-3333-333333333302',
  date '2028-06-02', date '2028-06-04', 2, 'Other', 'other@example.test', null) $$,
  '23P01', 'unit_unavailable', 'RPC bookings still enforce exclusion for another guest');
select throws_ok(
  format('select public.confirm_demo_payment(%L::uuid)', (select (booking).id from demo_second)),
  'P0002', 'not_found', 'another guest cannot confirm or discover the booking');
reset role;
select is((select status::text from public.bookings where id = (select (booking).id from demo_second)),
  'PENDING_PAYMENT', 'another guest did not change the booking');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a5000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
select is((select (public.confirm_demo_payment((select (booking).id from demo_second))).status::text),
  'CONFIRMED', 'owner confirms a valid pending booking');
select is((select (public.confirm_demo_payment((select (booking).id from demo_second))).status::text),
  'CONFIRMED', 'second confirmation is idempotent');
reset role;
select is((select count(*)::int from public.payments where booking_id = (select (booking).id from demo_second)),
  0, 'demo confirmation creates no Stripe payment row');

set local role authenticated;
create temporary table demo_expired as
  select public.create_booking('33333333-3333-3333-3333-333333333303',
    date '2028-07-01', date '2028-07-03', 2, 'Guest', 'guest@example.test', null) as booking;
reset role;
update public.bookings set created_at = now() - interval '10 minutes',
  hold_expires_at = now() - interval '5 minutes'
  where id = (select (booking).id from demo_expired);
set local role authenticated;
select is((select (public.confirm_demo_payment((select (booking).id from demo_expired))).status::text),
  'CANCELED', 'expired confirmation returns a canceled row so the update commits');
select is((select cancellation_reason::text from public.bookings where id = (select (booking).id from demo_expired)),
  'HOLD_EXPIRED', 'expired confirmation persists HOLD_EXPIRED');
select throws_ok(
  format('select public.confirm_demo_payment(%L::uuid)', (select (booking).id from demo_expired)),
  'P0002', 'not_found', 'a canceled booking cannot be confirmed');

reset role;
select * from finish();
rollback;
