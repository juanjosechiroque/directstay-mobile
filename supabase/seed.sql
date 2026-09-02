-- DirectStay demo / reference data (entirely fictional).
--
-- config.toml declares [db.seed] enabled with sql_paths = ["./seed.sql"], so this file
-- is applied after the migrations on every `supabase db reset`.
--
-- Rules honoured here:
--   * INSERT statements only. No DDL.
--   * Deterministic UUIDs, so tests and screenshots can rely on stable ids.
--   * Money as integer minor units (USD 120.00 -> 12000) plus an explicit currency.
--   * No auth users, no bookings, no payments. No secrets, no real personal data.
--   * The demo business (Ayni Hospitality / Ayni Mountain Cabins) is data only and must
--     never be referenced from reusable application or database logic.

-- Organization: Ayni Hospitality
insert into public.organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Ayni Hospitality')
on conflict (id) do nothing;

-- Property: Ayni Mountain Cabins (Sacred Valley, Cusco, Peru - fictional).
-- Frozen demo config: timezone America/Lima, check-in 15:00, check-out 12:00, USD.
insert into public.properties (
  id, organization_id, name, slug, description,
  timezone, check_in_time, check_out_time, currency, is_active
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Ayni Mountain Cabins',
  'ayni-mountain-cabins',
  'Fictional demo property used for seed data, screenshots and tests only.',
  'America/Lima',
  '15:00',
  '12:00',
  'USD',
  true
)
on conflict (id) do nothing;

-- Units: Killa, Inti, Wayra, Sumaq. Fictional nightly rates, USD minor units.
insert into public.units (
  id, property_id, name, slug,
  max_guests, nightly_rate_minor, currency, is_active
)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222',
   'Killa', 'killa', 2, 12000, 'USD', true),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222',
   'Inti', 'inti', 4, 18000, 'USD', true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222',
   'Wayra', 'wayra', 3, 15000, 'USD', true),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222222',
   'Sumaq', 'sumaq', 6, 26000, 'USD', true)
on conflict (id) do nothing;
