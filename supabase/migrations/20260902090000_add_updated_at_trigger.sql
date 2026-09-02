-- Corrective migration: keep `updated_at` current on every UPDATE.
--
-- The initial schema (20260902000000_initial_schema.sql) is already published and is
-- NOT edited here. It gives every mutable table an `updated_at` column that defaults
-- to now() on INSERT but is never advanced on UPDATE. This migration adds one
-- reusable trigger function and attaches it, BEFORE UPDATE, to every mutable table
-- that carries `updated_at`.
--
-- Why BEFORE UPDATE: the trigger rewrites NEW before the row is persisted, so the new
-- timestamp lands in the same write with no follow-up UPDATE and no race. now() is the
-- transaction start time, matching the rest of the schema (e.g. bookings.hold_expires_at
-- is defined as created_at + interval '5 minutes').
--
-- Grants and RLS policies from the initial migration are intentionally left untouched:
--   * `authenticated` has no UPDATE grant on organizations / properties / units /
--     bookings / payments / availability_blocks, so it cannot write `updated_at` there.
--   * On `profiles` the column-level grant is `UPDATE (display_name, phone)` only, so a
--     client still cannot write `updated_at` (or `id` / `created_at`) directly.

begin;

-- Reusable trigger function. plpgsql is required for trigger bodies. search_path is
-- pinned to empty so nothing on the caller's search_path can shadow objects used here;
-- now() resolves from pg_catalog, which is always implicitly in scope.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger helper: forces updated_at = now() (transaction time). Not part of the client API surface.';

-- The client never calls this directly. Row-level triggers do not check EXECUTE on the
-- trigger function, but revoking keeps the API surface explicit and blocks any direct
-- invocation by the Data API roles.
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;

create trigger set_updated_at_on_organizations
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_updated_at_on_properties
  before update on public.properties
  for each row execute function public.set_updated_at();

create trigger set_updated_at_on_units
  before update on public.units
  for each row execute function public.set_updated_at();

create trigger set_updated_at_on_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_on_bookings
  before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger set_updated_at_on_payments
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger set_updated_at_on_availability_blocks
  before update on public.availability_blocks
  for each row execute function public.set_updated_at();

commit;
