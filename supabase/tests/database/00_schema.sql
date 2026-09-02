-- Schema & domain shape: tables, enums, critical columns, storage types and the
-- constraints that encode the frozen invariants exist.
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

-- ---- tables ----
select has_table('public'::name, 'organizations'::name, 'table organizations exists');
select has_table('public'::name, 'properties'::name, 'table properties exists');
select has_table('public'::name, 'units'::name, 'table units exists');
select has_table('public'::name, 'unit_images'::name, 'table unit_images exists');
select has_table('public'::name, 'profiles'::name, 'table profiles exists');
select has_table('public'::name, 'bookings'::name, 'table bookings exists');
select has_table('public'::name, 'payments'::name, 'table payments exists');
select has_table('public'::name, 'availability_blocks'::name, 'table availability_blocks exists');

-- ---- enums and labels ----
select has_type('public'::name, 'booking_status'::name, 'enum booking_status exists');
select has_type('public'::name, 'payment_status'::name, 'enum payment_status exists');
select has_type('public'::name, 'cancellation_reason'::name, 'enum cancellation_reason exists');

select enum_has_labels('public'::name, 'booking_status'::name,
  array['PENDING_PAYMENT', 'CONFIRMED', 'CANCELED', 'REFUNDED'],
  'booking_status carries exactly the four frozen states');
select enum_has_labels('public'::name, 'payment_status'::name,
  array['CREATED', 'PROCESSING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED'],
  'payment_status carries exactly the six frozen states');
select enum_has_labels('public'::name, 'cancellation_reason'::name,
  array['HOLD_EXPIRED', 'USER_CANCELLED', 'SYSTEM'],
  'cancellation_reason carries exactly the three frozen values');

-- ---- critical columns ----
select has_column('public'::name, 'properties'::name, 'timezone'::name, 'properties.timezone exists');
select has_column('public'::name, 'properties'::name, 'check_in_time'::name, 'properties.check_in_time exists');
select has_column('public'::name, 'properties'::name, 'check_out_time'::name, 'properties.check_out_time exists');
select has_column('public'::name, 'properties'::name, 'currency'::name, 'properties.currency exists');
select has_column('public'::name, 'units'::name, 'nightly_rate_minor'::name, 'units.nightly_rate_minor exists');
select has_column('public'::name, 'units'::name, 'currency'::name, 'units.currency exists');
select has_column('public'::name, 'bookings'::name, 'status'::name, 'bookings.status exists');
select has_column('public'::name, 'bookings'::name, 'check_in'::name, 'bookings.check_in exists');
select has_column('public'::name, 'bookings'::name, 'check_out'::name, 'bookings.check_out exists');
select has_column('public'::name, 'bookings'::name, 'date_range'::name, 'bookings.date_range exists');
select has_column('public'::name, 'bookings'::name, 'hold_expires_at'::name, 'bookings.hold_expires_at exists');
select has_column('public'::name, 'bookings'::name, 'nightly_rate_minor'::name, 'bookings.nightly_rate_minor exists');
select has_column('public'::name, 'bookings'::name, 'total_amount_minor'::name, 'bookings.total_amount_minor exists');
select has_column('public'::name, 'payments'::name, 'status'::name, 'payments.status exists');
select has_column('public'::name, 'payments'::name, 'amount_minor'::name, 'payments.amount_minor exists');
select has_column('public'::name, 'profiles'::name, 'updated_at'::name, 'profiles.updated_at exists');

-- ---- money is stored as bigint (integer minor units, never floating point) ----
select col_type_is('public'::name, 'units'::name, 'nightly_rate_minor'::name, 'bigint',
  'units.nightly_rate_minor is bigint');
select col_type_is('public'::name, 'bookings'::name, 'nightly_rate_minor'::name, 'bigint',
  'bookings.nightly_rate_minor is bigint');
select col_type_is('public'::name, 'bookings'::name, 'total_amount_minor'::name, 'bigint',
  'bookings.total_amount_minor is bigint');
select col_type_is('public'::name, 'payments'::name, 'amount_minor'::name, 'bigint',
  'payments.amount_minor is bigint');

-- ---- timestamp columns are timestamptz ----
select col_type_is('public'::name, 'bookings'::name, 'hold_expires_at'::name,
  'timestamp with time zone', 'bookings.hold_expires_at is timestamptz');
select col_type_is('public'::name, 'bookings'::name, 'created_at'::name,
  'timestamp with time zone', 'bookings.created_at is timestamptz');
select col_type_is('public'::name, 'bookings'::name, 'updated_at'::name,
  'timestamp with time zone', 'bookings.updated_at is timestamptz');

-- ---- constraints encoding the frozen invariants ----
select ok(
  exists (select 1 from pg_constraint where conname = 'bookings_check_out_after_check_in'),
  'constraint bookings_check_out_after_check_in exists');
select ok(
  exists (select 1 from pg_constraint where conname = 'bookings_total_matches_price_snapshot'),
  'constraint bookings_total_matches_price_snapshot exists');
select ok(
  exists (select 1 from pg_constraint where conname = 'bookings_hold_expires_exactly_five_minutes_after_creation'),
  'constraint bookings_hold_expires_exactly_five_minutes_after_creation exists');
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'bookings_prevent_overlapping_inventory_claims' and contype = 'x'
  ),
  'bookings has the partial GiST exclusion constraint for overlapping inventory claims');
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'payments_one_succeeded_payment_per_booking_idx'
  ),
  'partial unique index enforcing one SUCCEEDED payment per booking exists');

select * from finish();
rollback;
