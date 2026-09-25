-- Anonymous authenticated users receive the same owner-scoped RLS and RPC boundaries:
--   * Auth inserts create a profile automatically
--   * an anonymous guest reads only its profile and reservations
--   * private stay data is limited to its own CONFIRMED booking
--   * anonymous authenticated users can create via RPC but cannot write tables
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

insert into auth.users (id, email, is_anonymous) values
  ('f1000000-0000-0000-0000-000000000001', null, true),
  ('f1000000-0000-0000-0000-000000000002', null, true),
  ('f1000000-0000-0000-0000-000000000003', 'regular-other@example.test', false);

select is(
  (select count(*)::int from public.profiles where id = 'f1000000-0000-0000-0000-000000000001'),
  1,
  'creating an anonymous auth user automatically creates its profile');

insert into public.bookings (
  id, unit_id, guest_profile_id, status, confirmed_at, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor
)
values
  ('f2000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333301',
   'f1000000-0000-0000-0000-000000000001', 'CONFIRMED', now(), date '2029-01-10', date '2029-01-12',
   2, 'Anonymous owner', 'owner@example.test', 'USD', 12000, 24000),
  ('f2000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333302',
   'f1000000-0000-0000-0000-000000000001', 'PENDING_PAYMENT', null, date '2029-02-10', date '2029-02-12',
   2, 'Anonymous owner', 'owner@example.test', 'USD', 18000, 36000),
  ('f2000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333303',
   'f1000000-0000-0000-0000-000000000002', 'CONFIRMED', now(), date '2029-03-10', date '2029-03-12',
   2, 'Other anonymous', 'other@example.test', 'USD', 15000, 30000),
  ('f2000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333304',
   'f1000000-0000-0000-0000-000000000003', 'CONFIRMED', now(), date '2029-04-10', date '2029-04-12',
   2, 'Regular user', 'regular@example.test', 'USD', 15000, 30000);

insert into public.payments (booking_id, amount_minor, currency, stripe_payment_intent_id)
values ('f2000000-0000-0000-0000-000000000001', 24000, 'USD', 'pi_anonymous_owner_fixture');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';

select is((select count(*)::int from public.profiles), 1,
  'an anonymous user reads exactly its own profile');
select is((select id from public.profiles), 'f1000000-0000-0000-0000-000000000001'::uuid,
  'the visible profile belongs to the anonymous auth.uid()');
select is_empty($$
  select 1 from public.profiles where id in (
    'f1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000003')
$$, 'an anonymous user cannot read another anonymous or regular profile');

select is((select count(*)::int from public.bookings), 2,
  'an anonymous user reads only its own bookings');
select is_empty($$
  select 1 from public.bookings where guest_profile_id in (
    'f1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000003')
$$, 'an anonymous user cannot read another anonymous or regular user booking');

select isnt(
  public.get_stay_information('f2000000-0000-0000-0000-000000000001') ->> 'wifiNetwork',
  null,
  'an anonymous owner reads stay information for its own confirmed booking');
select is(public.get_stay_information('f2000000-0000-0000-0000-000000000002'), null,
  'an anonymous owner gets no stay information for its pending booking');
select is(public.get_stay_information('f2000000-0000-0000-0000-000000000003'), null,
  'an anonymous user gets no stay information for another anonymous booking');
select is(public.get_stay_information('f2000000-0000-0000-0000-000000000004'), null,
  'an anonymous user gets no stay information for a regular user booking');

select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333305', 'f1000000-0000-0000-0000-000000000001',
    date '2030-01-10', date '2030-01-12', 2, 'Guest', 'guest@example.test', 'USD', 12000, 24000)
$$, '42501', null, 'an anonymous user cannot insert directly into bookings');
select throws_ok($$
  insert into public.payments (booking_id, amount_minor, currency, stripe_payment_intent_id)
  values ('f2000000-0000-0000-0000-000000000001', 24000, 'USD', 'pi_anonymous_forbidden')
$$, '42501', null, 'an anonymous user cannot insert into payments');
select throws_ok($$
  update public.bookings set status = 'CONFIRMED', confirmed_at = now()
  where id = 'f2000000-0000-0000-0000-000000000002'
$$, '42501', null, 'an anonymous user cannot confirm its own pending booking directly');
reset role;
select is(
  (select status::text from public.bookings where id = 'f2000000-0000-0000-0000-000000000002'),
  'PENDING_PAYMENT',
  'the pending booking stays pending after the forbidden update');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
select throws_ok($$
  update public.payments set amount_minor = 1
  where stripe_payment_intent_id = 'pi_anonymous_owner_fixture'
$$, '42501', null, 'an anonymous user cannot update payments');
select throws_ok($$
  delete from public.payments where stripe_payment_intent_id = 'pi_anonymous_owner_fixture'
$$, '42501', null, 'an anonymous user cannot delete payments');
select throws_ok($$
  delete from public.bookings where id = 'f2000000-0000-0000-0000-000000000002'
$$, '42501', null, 'an anonymous user cannot delete its own booking');
select lives_ok($$
  select public.create_booking('ayni-hospitality', '33333333-3333-3333-3333-333333333305', date '2030-01-10',
    date '2030-01-12', 2, 'Guest', 'guest@example.test', null)
$$, 'an anonymous authenticated user can execute create_booking');

reset role;
select * from finish();
rollback;
