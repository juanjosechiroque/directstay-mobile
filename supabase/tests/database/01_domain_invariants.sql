-- Domain invariants enforced by the database:
--   * check_out must be strictly after check_in
--   * total_amount_minor must equal nightly_rate_minor * nights (pricing snapshot)
--   * hold_expires_at must be exactly created_at + 5 minutes
--   * at most one SUCCEEDED payment per booking
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

-- Fixture: one guest. Inserting into auth.users fires on_auth_user_created, which
-- creates the matching profile row.
insert into auth.users (id, email)
values ('a0000000-0000-0000-0000-000000000001', 'domain-guest@example.test');

-- ---- check_out > check_in ----
-- check_out == check_in produces a valid (empty) daterange, so the CHECK constraint
-- bookings_check_out_after_check_in is what rejects it (23514).
select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'a0000000-0000-0000-0000-000000000001',
    date '2026-10-10', date '2026-10-10', 2, 'Guest', 'g@example.test', 'USD', 12000, 0)
$$, '23514', null, 'check_out equal to check_in is rejected by the CHECK constraint');

-- check_out < check_in cannot even build the generated date_range column, so it is
-- rejected earlier with 22000 (data_exception). Either way the row never persists.
select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'a0000000-0000-0000-0000-000000000001',
    date '2026-10-12', date '2026-10-10', 2, 'Guest', 'g@example.test', 'USD', 12000, 12000)
$$, '22000', null, 'check_out strictly before check_in is rejected by the generated date_range');

-- ---- total_amount_minor = nightly_rate_minor * nights ----
select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'a0000000-0000-0000-0000-000000000001',
    date '2026-10-10', date '2026-10-13', 2, 'Guest', 'g@example.test', 'USD', 12000, 30000)
$$, '23514', null, 'total_amount_minor that is not rate x nights is rejected');

select lives_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'a0000000-0000-0000-0000-000000000001',
    date '2026-10-10', date '2026-10-13', 2, 'Guest', 'g@example.test', 'USD', 12000, 36000)
$$, 'total_amount_minor = rate x 3 nights is accepted');

-- ---- hold_expires_at = created_at + exactly 5 minutes ----
select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor, hold_expires_at)
  values ('33333333-3333-3333-3333-333333333302', 'a0000000-0000-0000-0000-000000000001',
    date '2026-10-10', date '2026-10-12', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000,
    now() + interval '10 minutes')
$$, '23514', null, 'hold_expires_at other than created_at + 5 minutes is rejected');

select is(
  (select hold_expires_at - created_at
     from public.bookings
    where guest_profile_id = 'a0000000-0000-0000-0000-000000000001'
      and check_in = date '2026-10-10' and check_out = date '2026-10-13'),
  interval '5 minutes',
  'a stored PENDING_PAYMENT booking retains inventory for exactly 5 minutes');

-- ---- at most one SUCCEEDED payment per booking ----
insert into public.payments (booking_id, status, amount_minor, currency, stripe_payment_intent_id, succeeded_at)
select id, 'SUCCEEDED', total_amount_minor, 'USD', 'pi_domain_1', now()
from public.bookings
where guest_profile_id = 'a0000000-0000-0000-0000-000000000001'
  and check_in = date '2026-10-10' and check_out = date '2026-10-13';

select throws_ok($$
  insert into public.payments (booking_id, status, amount_minor, currency, stripe_payment_intent_id, succeeded_at)
  select id, 'SUCCEEDED', total_amount_minor, 'USD', 'pi_domain_2', now()
  from public.bookings
  where guest_profile_id = 'a0000000-0000-0000-0000-000000000001'
    and check_in = date '2026-10-10' and check_out = date '2026-10-13'
$$, '23505', null, 'a second SUCCEEDED payment for the same booking is rejected');

select lives_ok($$
  insert into public.payments (booking_id, status, amount_minor, currency, stripe_payment_intent_id, failure_code, failed_at)
  select id, 'FAILED', total_amount_minor, 'USD', 'pi_domain_3', 'card_declined', now()
  from public.bookings
  where guest_profile_id = 'a0000000-0000-0000-0000-000000000001'
    and check_in = date '2026-10-10' and check_out = date '2026-10-13'
$$, 'a non-succeeded payment attempt for the same booking is still allowed');

select * from finish();
rollback;
