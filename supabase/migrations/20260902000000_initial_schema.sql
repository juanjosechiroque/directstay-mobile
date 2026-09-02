begin;

create extension if not exists btree_gist;

create type public.booking_status as enum (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELED',
  'REFUNDED'
);

create type public.payment_status as enum (
  'CREATED',
  'PROCESSING',
  'REQUIRES_ACTION',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED'
);

create type public.cancellation_reason as enum (
  'HOLD_EXPIRED',
  'USER_CANCELLED',
  'SYSTEM'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  timezone text not null check (btrim(timezone) <> ''),
  check_in_time time not null,
  check_out_time time not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  max_guests integer not null check (max_guests > 0),
  nightly_rate_minor bigint not null check (nightly_rate_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, slug)
);

create table public.unit_images (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  storage_path text not null unique check (btrim(storage_path) <> ''),
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (unit_id, sort_order)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (display_name is null or btrim(display_name) <> ''),
  check (phone is null or btrim(phone) <> '')
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete restrict,
  guest_profile_id uuid not null references public.profiles (id) on delete restrict,
  status public.booking_status not null default 'PENDING_PAYMENT',
  check_in date not null,
  check_out date not null,
  date_range daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  guest_count integer not null check (guest_count > 0),
  guest_name text not null check (btrim(guest_name) <> ''),
  guest_email text not null check (btrim(guest_email) <> ''),
  guest_phone text,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  nightly_rate_minor bigint not null check (nightly_rate_minor > 0),
  total_amount_minor bigint not null check (total_amount_minor > 0),
  hold_expires_at timestamptz not null default (now() + interval '5 minutes'),
  confirmed_at timestamptz,
  canceled_at timestamptz,
  cancellation_reason public.cancellation_reason,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_check_out_after_check_in
    check (check_out > check_in),
  constraint bookings_total_matches_price_snapshot
    check (total_amount_minor = nightly_rate_minor * (check_out - check_in)),
  constraint bookings_hold_expires_exactly_five_minutes_after_creation
    check (hold_expires_at = created_at + interval '5 minutes'),
  constraint bookings_status_companion_fields
    check (
      (status = 'PENDING_PAYMENT'
        and confirmed_at is null
        and canceled_at is null
        and cancellation_reason is null
        and refunded_at is null)
      or (status = 'CONFIRMED'
        and confirmed_at is not null
        and canceled_at is null
        and cancellation_reason is null
        and refunded_at is null)
      or (status = 'CANCELED'
        and confirmed_at is null
        and canceled_at is not null
        and cancellation_reason is not null
        and refunded_at is null)
      or (status = 'REFUNDED'
        and confirmed_at is not null
        and canceled_at is null
        and cancellation_reason is null
        and refunded_at is not null)
    ),
  constraint bookings_prevent_overlapping_inventory_claims
    exclude using gist (
      unit_id with =,
      date_range with &&
    ) where (status in ('PENDING_PAYMENT', 'CONFIRMED'))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  status public.payment_status not null default 'CREATED',
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  stripe_payment_intent_id text not null unique check (btrim(stripe_payment_intent_id) <> ''),
  stripe_event_id text unique,
  stripe_refund_id text unique,
  failure_code text,
  failure_message text,
  succeeded_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  refunded_amount_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_refund_is_full_and_terminal
    check (
      (status = 'REFUNDED'
        and succeeded_at is not null
        and refunded_at is not null
        and refunded_amount_minor = amount_minor
        and stripe_refund_id is not null)
      or (status <> 'REFUNDED'
        and refunded_at is null
        and refunded_amount_minor is null
        and stripe_refund_id is null)
    ),
  constraint payments_status_timestamps
    check (
      (status in ('CREATED', 'PROCESSING', 'REQUIRES_ACTION')
        and succeeded_at is null
        and failed_at is null)
      or (status = 'SUCCEEDED'
        and succeeded_at is not null
        and failed_at is null)
      or (status = 'FAILED'
        and succeeded_at is null
        and failed_at is not null)
      or (status = 'REFUNDED'
        and succeeded_at is not null
        and failed_at is null)
    )
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete restrict,
  check_in date not null,
  check_out date not null,
  date_range daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  reason text not null check (btrim(reason) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_blocks_check_out_after_check_in check (check_out > check_in)
);

create index properties_organization_id_idx on public.properties (organization_id);
create index units_property_id_idx on public.units (property_id);
create index unit_images_unit_id_idx on public.unit_images (unit_id);
create index bookings_guest_profile_id_created_at_idx
  on public.bookings (guest_profile_id, created_at desc);
create index bookings_unit_id_check_in_check_out_idx
  on public.bookings (unit_id, check_in, check_out);
create index payments_booking_id_idx on public.payments (booking_id);
create unique index payments_one_succeeded_payment_per_booking_idx
  on public.payments (booking_id) where (status = 'SUCCEEDED');
create index availability_blocks_unit_id_check_in_check_out_idx
  on public.availability_blocks (unit_id, check_in, check_out);
create index availability_blocks_unit_id_date_range_idx
  on public.availability_blocks using gist (unit_id, date_range);

alter table public.organizations enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.unit_images enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.availability_blocks enable row level security;

create policy "Authenticated users can read active properties"
  on public.properties
  for select
  to authenticated
  using (is_active);

create policy "Authenticated users can read active units"
  on public.units
  for select
  to authenticated
  using (is_active);

create policy "Authenticated users can read unit images"
  on public.unit_images
  for select
  to authenticated
  using (true);

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Guests can read their own bookings"
  on public.bookings
  for select
  to authenticated
  using ((select auth.uid()) = guest_profile_id);

commit;
