-- Concurrency / inventory-blocking invariant (btree_gist + partial GiST exclusion on
-- bookings for PENDING_PAYMENT and CONFIRMED over daterange(check_in, check_out, '[)')):
--   * two overlapping PENDING_PAYMENT bookings for the same unit are rejected
--   * a CONFIRMED booking also blocks an overlapping claim
--   * same-day turnover ([.., d) then [d, ..)) is allowed
--   * CANCELED and REFUNDED bookings never block inventory
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

insert into auth.users (id, email)
values ('a0000000-0000-0000-0000-000000000002', 'concurrency-guest@example.test');

-- ---- 1) overlapping PENDING_PAYMENT bookings for the same unit (Killa) ----
insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
values ('33333333-3333-3333-3333-333333333301', 'a0000000-0000-0000-0000-000000000002',
  date '2026-10-10', date '2026-10-12', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000);

select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333301', 'a0000000-0000-0000-0000-000000000002',
    date '2026-10-11', date '2026-10-13', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000)
$$, '23P01', null, 'a second overlapping PENDING_PAYMENT booking for the same unit is rejected');

-- ---- 2) a CONFIRMED booking blocks an overlapping claim (Inti) ----
insert into public.bookings (unit_id, guest_profile_id, status, confirmed_at, check_in, check_out,
  guest_count, guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
values ('33333333-3333-3333-3333-333333333302', 'a0000000-0000-0000-0000-000000000002',
  'CONFIRMED', now(), date '2026-10-10', date '2026-10-12', 2, 'Guest', 'g@example.test',
  'USD', 12000, 24000);

select throws_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333302', 'a0000000-0000-0000-0000-000000000002',
    date '2026-10-11', date '2026-10-13', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000)
$$, '23P01', null, 'a PENDING_PAYMENT booking overlapping a CONFIRMED booking is rejected');

-- ---- 3) same-day turnover is allowed (Wayra): [.., 12) then [12, ..) ----
insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
  guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
values ('33333333-3333-3333-3333-333333333303', 'a0000000-0000-0000-0000-000000000002',
  date '2026-10-10', date '2026-10-12', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000);

select lives_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333303', 'a0000000-0000-0000-0000-000000000002',
    date '2026-10-12', date '2026-10-14', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000)
$$, 'same-day turnover (previous checkout day == next check-in day) is allowed');

-- ---- 4) CANCELED and REFUNDED bookings never block inventory (Sumaq) ----
insert into public.bookings (unit_id, guest_profile_id, status, canceled_at, cancellation_reason,
  check_in, check_out, guest_count, guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
values ('33333333-3333-3333-3333-333333333304', 'a0000000-0000-0000-0000-000000000002',
  'CANCELED', now(), 'HOLD_EXPIRED', date '2026-10-10', date '2026-10-12', 2, 'Guest',
  'g@example.test', 'USD', 12000, 24000);

insert into public.bookings (unit_id, guest_profile_id, status, confirmed_at, refunded_at,
  check_in, check_out, guest_count, guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
values ('33333333-3333-3333-3333-333333333304', 'a0000000-0000-0000-0000-000000000002',
  'REFUNDED', now(), now(), date '2026-10-10', date '2026-10-12', 2, 'Guest',
  'g@example.test', 'USD', 12000, 24000);

select lives_ok($$
  insert into public.bookings (unit_id, guest_profile_id, check_in, check_out, guest_count,
    guest_name, guest_email, currency, nightly_rate_minor, total_amount_minor)
  values ('33333333-3333-3333-3333-333333333304', 'a0000000-0000-0000-0000-000000000002',
    date '2026-10-10', date '2026-10-12', 2, 'Guest', 'g@example.test', 'USD', 12000, 24000)
$$, 'a new PENDING_PAYMENT booking is accepted over CANCELED and REFUNDED rows for the same dates');

select * from finish();
rollback;
