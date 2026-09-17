-- Private stay information RPC:
--   * only the authenticated owner of a CONFIRMED booking can read it
--   * a PENDING booking, another guest's booking and anyone signed out get nothing
--   * the response contains only the Mi estancia fields, never booking PII
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'stay-owner@example.test'),
  ('a1000000-0000-0000-0000-000000000002', 'stay-other@example.test');

insert into public.bookings (
  id, unit_id, guest_profile_id, status, confirmed_at, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor
)
values
  ('a2000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333301',
   'a1000000-0000-0000-0000-000000000001', 'CONFIRMED', now(),
   date '2027-06-01', date '2027-06-03', 2, 'Owner', 'owner@example.test', 'USD', 12000, 24000),
  ('a2000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333301',
   'a1000000-0000-0000-0000-000000000001', 'PENDING_PAYMENT', null,
   date '2027-07-01', date '2027-07-03', 2, 'Owner', 'owner@example.test', 'USD', 12000, 24000),
  ('a2000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333301',
   'a1000000-0000-0000-0000-000000000002', 'CONFIRMED', now(),
   date '2027-08-01', date '2027-08-03', 2, 'Other', 'other@example.test', 'USD', 12000, 24000);

-- ---- owner ----
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  public.get_stay_information('a2000000-0000-0000-0000-000000000001') ->> 'wifiNetwork',
  'AyniGuest',
  'the owner reads private stay information for a confirmed booking');
select is(
  public.get_stay_information('a2000000-0000-0000-0000-000000000002'),
  null,
  'the owner gets nothing for a pending booking');
select is(
  public.get_stay_information('a2000000-0000-0000-0000-000000000003'),
  null,
  'the owner cannot read another guest''s stay information');
select ok(
  not (public.get_stay_information('a2000000-0000-0000-0000-000000000001') ? 'guestEmail'),
  'the stay payload never contains booking PII');

reset role;

-- ---- other guest ----
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  public.get_stay_information('a2000000-0000-0000-0000-000000000003') ->> 'wifiNetwork',
  'AyniGuest',
  'another guest reads their own confirmed stay information');

reset role;

-- ---- signed out ----
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$
  select public.get_stay_information('a2000000-0000-0000-0000-000000000001')
$$, '42501', null, 'signed-out visitors cannot execute the private stay RPC');
reset role;

select * from finish();
rollback;
