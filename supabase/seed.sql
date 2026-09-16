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
--   * The demo business (Ayni Hospitality) is data only and must never be referenced
--     from reusable application or database logic.
--   * Images are explicit placeholders: `source_url`, `author` and `license` are NULL and
--     `verification_note` records the pending licensed-asset work. Never claim a license
--     that has not been verified.
--
-- Demonstrates one organization with two properties and several units, localized content
-- (es + en), public amenities/highlights, licensed-media placeholders and private stay
-- information that has no public read path.

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, is_active)
values ('11111111-1111-1111-1111-111111111111', 'Ayni Hospitality', 'ayni-hospitality', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Properties
--   * Ayni Mountain Cabins, Urubamba (Sacred Valley)
--   * Ayni Cusco (city)
-- Frozen demo config for Mountain Cabins: America/Lima, check-in 15:00, check-out 12:00.
-- Cusco city uses the same timezone and currency.
-- ---------------------------------------------------------------------------
insert into public.properties (
  id, organization_id, name, slug, description,
  timezone, check_in_time, check_out_time, currency, is_active,
  contact_whatsapp, contact_phone
)
values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'Ayni Mountain Cabins', 'ayni-mountain-cabins',
   'Fictional demo property used for seed data, screenshots and tests only.',
   'America/Lima', '15:00', '12:00', 'USD', true, '+51999000111', '+51845550123'),
  ('22222222-2222-2222-2222-222222222223',
   '11111111-1111-1111-1111-111111111111',
   'Ayni Cusco', 'ayni-cusco',
   'Fictional demo city property used for seed data, screenshots and tests only.',
   'America/Lima', '14:00', '11:00', 'USD', true, '+51999000222', '+51845550456')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Units
--   Mountain Cabins: Killa, Inti, Wayra, Sumaq
--   Ayni Cusco:      Sisa, Illapa
-- ---------------------------------------------------------------------------
insert into public.units (
  id, property_id, name, slug, max_guests, nightly_rate_minor, currency, is_active
)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222',
   'Killa', 'killa', 2, 12000, 'USD', true),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222',
   'Inti', 'inti', 4, 18000, 'USD', true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222',
   'Wayra', 'wayra', 3, 15000, 'USD', true),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222222',
   'Sumaq', 'sumaq', 6, 26000, 'USD', true),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222223',
   'Sisa', 'sisa', 3, 11000, 'USD', true),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222223',
   'Illapa', 'illapa', 2, 9500, 'USD', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Localized public content (es default, en prepared)
-- ---------------------------------------------------------------------------
insert into public.property_translations (
  property_id, locale, name, location_label, short_description, description
)
values
  ('22222222-2222-2222-2222-222222222222', 'es', 'Ayni Mountain Cabins',
   'Valle Sagrado, Cusco, Perú',
   'Cabañas de montaña de gestión familiar, rodeadas de eucaliptos y frente a los Andes.',
   'Ayni Mountain Cabins es un pequeño refugio familiar en el Valle Sagrado. Cada cabaña se construyó con madera local y está pensada para descansar: chimenea, vistas a la montaña y silencio. Atendemos directamente a nuestros huéspedes, sin intermediarios.'),
  ('22222222-2222-2222-2222-222222222222', 'en', 'Ayni Mountain Cabins',
   'Sacred Valley, Cusco, Peru',
   'Family-run mountain cabins surrounded by eucalyptus and facing the Andes.',
   'Ayni Mountain Cabins is a small family refuge in the Sacred Valley. Each cabin was built with local timber and designed for rest: fireplace, mountain views and quiet. We host our guests directly, with no intermediaries.'),
  ('22222222-2222-2222-2222-222222222223', 'es', 'Ayni Cusco',
   'Centro Histórico, Cusco, Perú',
   'Casa de huéspedes urbana a pocos minutos de la Plaza de Armas.',
   'Ayni Cusco es una casa de huéspedes en el centro histórico. Habitaciones cálidas con paredes de adobe, patio interior y desayuno casero. Ideal para explorar la ciudad a pie.'),
  ('22222222-2222-2222-2222-222222222223', 'en', 'Ayni Cusco',
   'Historic Centre, Cusco, Peru',
   'Urban guest house a few minutes from the Plaza de Armas.',
   'Ayni Cusco is a guest house in the historic centre. Warm rooms with adobe walls, an inner courtyard and homemade breakfast. Ideal for exploring the city on foot.')
on conflict (property_id, locale) do nothing;

insert into public.unit_translations (unit_id, locale, summary, description)
values
  ('33333333-3333-3333-3333-333333333301', 'es',
   'Cabaña íntima para dos, con chimenea y vista a la montaña.',
   'Killa es la cabaña más pequeña y luminosa. Tiene una cama queen, chimenea de leña y una ventana panorámica hacia el valle. Ideal para parejas que buscan silencio.'),
  ('33333333-3333-3333-3333-333333333301', 'en',
   'Intimate cabin for two, with a fireplace and mountain views.',
   'Killa is the smallest and brightest cabin. It has a queen bed, a wood fireplace and a panoramic window over the valley. Ideal for couples looking for quiet.'),
  ('33333333-3333-3333-3333-333333333302', 'es',
   'Cabaña familiar con cocina, terraza y espacio para cuatro.',
   'Inti mira hacia el este y recibe el sol de la mañana. Cuenta con dos habitaciones, cocina equipada y una terraza amplia con mesa de madera para compartir.'),
  ('33333333-3333-3333-3333-333333333302', 'en',
   'Family cabin with a kitchen, terrace and room for four.',
   'Inti faces east and gets the morning sun. It has two bedrooms, a fitted kitchen and a wide terrace with a wooden table to share.'),
  ('33333333-3333-3333-3333-333333333303', 'es',
   'Refugio de tres plazas con chimenea y terraza al valle.',
   'Wayra está en el borde del terreno, donde corre el viento. Tiene cama matrimonial, sofá cama, chimenea y una terraza privada para ver el atardecer.'),
  ('33333333-3333-3333-3333-333333333303', 'en',
   'Three-guest retreat with a fireplace and a terrace over the valley.',
   'Wayra sits at the edge of the land, where the wind blows. It has a double bed, a sofa bed, a fireplace and a private terrace to watch the sunset.'),
  ('33333333-3333-3333-3333-333333333304', 'es',
   'Cabaña grande para grupos, con cocina y terraza panorámica.',
   'Sumaq es la cabaña más amplia: tres habitaciones, dos baños, cocina completa y una terraza con vista de 180° al Valle Sagrado. Pensada para familias y grupos.'),
  ('33333333-3333-3333-3333-333333333304', 'en',
   'Large cabin for groups, with a kitchen and panoramic terrace.',
   'Sumaq is the largest cabin: three bedrooms, two bathrooms, a full kitchen and a terrace with 180° views of the Sacred Valley. Made for families and groups.'),
  ('33333333-3333-3333-3333-333333333305', 'es',
   'Habitación luminosa de tres plazas en el centro de Cusco.',
   'Sisa es una habitación amplia con paredes de adobe, cama queen y sofá cama. Ventanal al patio interior y baño privado.'),
  ('33333333-3333-3333-3333-333333333305', 'en',
   'Bright three-guest room in central Cusco.',
   'Sisa is a spacious room with adobe walls, a queen bed and a sofa bed. Large window onto the inner courtyard and a private bathroom.'),
  ('33333333-3333-3333-3333-333333333306', 'es',
   'Habitación doble acogedora a pasos de la Plaza de Armas.',
   'Illapa tiene cama matrimonial, escritorio y una ventana con vista a los tejados del centro histórico.'),
  ('33333333-3333-3333-3333-333333333306', 'en',
   'Cosy double room steps from the Plaza de Armas.',
   'Illapa has a double bed, a desk and a window overlooking the historic centre rooftops.')
on conflict (unit_id, locale) do nothing;

-- ---------------------------------------------------------------------------
-- Public amenities + per-unit assignment
-- ---------------------------------------------------------------------------
insert into public.amenities (code, is_public)
values
  ('wifi', true), ('breakfast', true), ('private_bathroom', true), ('fireplace', true),
  ('mountain_view', true), ('terrace', true), ('heating', true), ('free_parking', true),
  ('kitchenette', true), ('family_friendly', true)
on conflict (code) do nothing;

insert into public.unit_amenities (unit_id, amenity_code, sort_order)
values
  ('33333333-3333-3333-3333-333333333301', 'wifi', 0),
  ('33333333-3333-3333-3333-333333333301', 'fireplace', 1),
  ('33333333-3333-3333-3333-333333333301', 'mountain_view', 2),
  ('33333333-3333-3333-3333-333333333301', 'private_bathroom', 3),
  ('33333333-3333-3333-3333-333333333301', 'heating', 4),
  ('33333333-3333-3333-3333-333333333302', 'wifi', 0),
  ('33333333-3333-3333-3333-333333333302', 'kitchenette', 1),
  ('33333333-3333-3333-3333-333333333302', 'terrace', 2),
  ('33333333-3333-3333-3333-333333333302', 'private_bathroom', 3),
  ('33333333-3333-3333-3333-333333333302', 'heating', 4),
  ('33333333-3333-3333-3333-333333333302', 'family_friendly', 5),
  ('33333333-3333-3333-3333-333333333303', 'wifi', 0),
  ('33333333-3333-3333-3333-333333333303', 'fireplace', 1),
  ('33333333-3333-3333-3333-333333333303', 'terrace', 2),
  ('33333333-3333-3333-3333-333333333303', 'mountain_view', 3),
  ('33333333-3333-3333-3333-333333333303', 'private_bathroom', 4),
  ('33333333-3333-3333-3333-333333333304', 'wifi', 0),
  ('33333333-3333-3333-3333-333333333304', 'kitchenette', 1),
  ('33333333-3333-3333-3333-333333333304', 'terrace', 2),
  ('33333333-3333-3333-3333-333333333304', 'mountain_view', 3),
  ('33333333-3333-3333-3333-333333333304', 'private_bathroom', 4),
  ('33333333-3333-3333-3333-333333333304', 'heating', 5),
  ('33333333-3333-3333-3333-333333333304', 'family_friendly', 6),
  ('33333333-3333-3333-3333-333333333305', 'wifi', 0),
  ('33333333-3333-3333-3333-333333333305', 'breakfast', 1),
  ('33333333-3333-3333-3333-333333333305', 'private_bathroom', 2),
  ('33333333-3333-3333-3333-333333333305', 'heating', 3),
  ('33333333-3333-3333-3333-333333333306', 'wifi', 0),
  ('33333333-3333-3333-3333-333333333306', 'breakfast', 1),
  ('33333333-3333-3333-3333-333333333306', 'private_bathroom', 2)
on conflict (unit_id, amenity_code) do nothing;

insert into public.property_highlights (property_id, highlight_code, sort_order)
values
  ('22222222-2222-2222-2222-222222222222', 'mountain_view', 0),
  ('22222222-2222-2222-2222-222222222222', 'local_hosts', 1),
  ('22222222-2222-2222-2222-222222222222', 'breakfast_included', 2),
  ('22222222-2222-2222-2222-222222222222', 'direct_booking', 3),
  ('22222222-2222-2222-2222-222222222222', 'nature', 4),
  ('22222222-2222-2222-2222-222222222223', 'local_hosts', 0),
  ('22222222-2222-2222-2222-222222222223', 'breakfast_included', 1),
  ('22222222-2222-2222-2222-222222222223', 'direct_booking', 2)
on conflict (property_id, highlight_code) do nothing;

-- ---------------------------------------------------------------------------
-- Catalog media (PLACEHOLDERS — no licensed assets exist yet)
-- storage_path values are placeholders that intentionally do not resolve; the app falls
-- back to a deterministic local gradient. license/author/source_url stay NULL until a
-- verifiable asset is added, and verification_note records the pending work.
-- ---------------------------------------------------------------------------
insert into public.property_images (
  id, property_id, storage_path, sort_order, license, verification_note
)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'placeholders/ayni-mountain-cabins/hero', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222223',
   'placeholders/ayni-cusco/hero', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).')
on conflict (id) do nothing;

insert into public.unit_images (id, unit_id, storage_path, sort_order, license, verification_note)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333301',
   'placeholders/ayni-mountain-cabins/killa-1', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333301',
   'placeholders/ayni-mountain-cabins/killa-2', 1, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333302',
   'placeholders/ayni-mountain-cabins/inti-1', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333303',
   'placeholders/ayni-mountain-cabins/wayra-1', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('bbbbbbbb-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333304',
   'placeholders/ayni-mountain-cabins/sumaq-1', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('bbbbbbbb-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333305',
   'placeholders/ayni-cusco/sisa-1', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).'),
  ('bbbbbbbb-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333306',
   'placeholders/ayni-cusco/illapa-1', 0, null,
   'Placeholder pending licensed asset (CC0 / public domain / compatible commercial).')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Private stay information (no public read path)
-- ---------------------------------------------------------------------------
insert into public.property_stay_information (
  property_id, wifi_network, wifi_password, breakfast_info, checkin_instructions, directions
)
values
  ('22222222-2222-2222-2222-222222222222', 'AyniGuest', 'valle-sagrado',
   'Desayuno andino con pan de maíz, frutas del valle y café de la selva, servido de 7:00 a 9:30 en el salón principal.',
   'Al llegar, preséntate en la recepción del salón principal. Si llegas después de las 20:00, escríbenos por WhatsApp.',
   'Estamos a 15 minutos de Urubamba por la carretera a Ollantaytambo, ingreso señalizado en el km 4. Coordinamos traslado privado desde el aeropuerto de Cusco.'),
  ('22222222-2222-2222-2222-222222222223', 'AyniCusco', 'plaza-ayni',
   'Desayuno casero de 7:00 a 9:30 en el patio interior.',
   'Toca el timbre de la puerta principal; el anfitrión te recibe en el patio. Recepción hasta las 22:00.',
   'A tres calles de la Plaza de Armas, sobre la calle de las piedras. Referencia: junto a la capilla de adobe.')
on conflict (property_id) do nothing;

-- ---------------------------------------------------------------------------
-- Availability scenario for tests: Sisa is blocked for maintenance on fixed dates.
-- This makes "unavailable" reproducible without creating bookings in the seed.
-- ---------------------------------------------------------------------------
insert into public.availability_blocks (id, unit_id, check_in, check_out, reason)
values
  ('cccccccc-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333305',
   date '2026-12-24', date '2026-12-27', 'DEMO_MAINTENANCE')
on conflict (id) do nothing;
