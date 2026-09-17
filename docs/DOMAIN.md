# Domain

This document records the DirectStay domain model and its invariants. Anything
that changes these rules must update this document first.

## Model

```text
organizations
properties
property_translations
property_images
property_image_translations
property_highlights
property_stay_information
units
unit_translations
unit_images
unit_image_translations
unit_amenities
amenities
availability_blocks
profiles
bookings
payments
```

Relationships:

```text
auth.users → profiles → bookings → payments
organizations → properties → units → {unit_images, unit_amenities, availability_blocks, bookings}
properties → property_translations / property_images / property_highlights / property_stay_information
unit_images → unit_image_translations
property_images → property_image_translations
```

No `stays`, `extras`, `booking_extras`, `service_requests`, `reviews`, `host_chat`,
`housekeeping` tables.

## Organization, property and unit

- One organization (brand) per deployment, with one or more properties. The client selects
  it with `EXPO_PUBLIC_ORGANIZATION_SLUG`; the server scopes every public read to that
  organization's active slug. The slug is stable and unique.
- `organizations.is_active` and `properties.is_active` / `units.is_active` are part of the
  availability and catalog rules, not cosmetic flags.
- `Property`/`Unit` are generic; the demo business (Ayni) is data only.

## Localized content (decision)

Public catalog copy is stored in **translation tables** keyed by `(entity_id, locale)`:
`property_translations` (`name`, `location_label`, `short_description`, `description`) and
`unit_translations` (`summary`, `description`). Base tables keep a default-language column
as a fallback. The public read model resolves the requested locale; screens never localize
data by hand. Proper nouns (unit names) are not translated. Spanish is the default; the
schema already supports English.

## Public catalog vs private stay information

- **Public** (anon + authenticated): the active organization, its active properties and
  units, localized content, public amenities, property highlights and catalog media. This
  is served only through the `get_catalog` / `get_unit` / `search_available_units` RPCs,
  always scoped to the active organization.
- **Private**: `property_stay_information` (Wi-Fi network/password, breakfast, arrival
  instructions, directions) has no public read path. RLS denies direct access to every
  client role; the only read is `get_stay_information(booking_id)`.
- **Access rule (frozen for this MVP):** private stay information is readable **only by
  the authenticated owner of a booking whose status is `CONFIRMED`**. `PENDING_PAYMENT`,
  `CANCELED` and `REFUNDED` never enable access, and no other user ever can.

## Images and licensing

- Catalog media lives in the public-read storage bucket `catalog-media`. No `anon` or
  `authenticated` role has insert/update/delete access; uploads happen out of band.
- Every image carries `source_url`, `author`, `license`, `attribution_text`,
  `license_verified_at` and `verification_note`, plus localized `alt_text` in its
  translation table. Allowed licenses: `CC0`, `PUBLIC_DOMAIN`, `CC_BY`, `CC_BY_SA`,
  `COMMERCIAL`. A placeholder with an unknown/null license is rendered as a local
  gradient, never presented as a licensed photo.

## Profile creation

- A profile row is created automatically by the `on_auth_user_created` trigger when a new
  `auth.users` row appears (including the `display_name` from signup metadata). Clients
  never receive an INSERT policy and can only read/update their own profile.

## Dates and timezone (frozen)

- Booking intervals use `[checkIn, checkOut)`: check-in inclusive, check-out exclusive.
  Same-day turnover is allowed (existing booking Sep 10→12; new booking Sep 12→14 is OK).
- `check_in` / `check_out` are business `DATE`s in the property timezone, not global
  timestamps. Overlap logic uses ranges: `daterange(check_in, check_out, '[)')`.
- `properties` stores its timezone as data (`America/Lima` for the demo) and its
  check-in/check-out times and currency. Demo config: check-in 15:00, checkout 12:00,
  USD. These are property data, not hardcoded domain values.
- A pending booking stores its inventory-retention expiry in
  `bookings.hold_expires_at` (`created_at + exactly 5 minutes`, as `timestamptz`).

## Money and pricing (frozen)

- Persist money in integer minor units (USD 120.00 → `12000`) plus a `currency` column.
  Column naming convention: `*_minor` (e.g. `nightly_rate_minor`, `total_amount_minor`).
  Never floating point.
- Pricing: `nightly rate × number of nights`. No taxes, fees, discounts, promotions,
  loyalty, dynamic or occupancy pricing.
- The server is authoritative over the final payable amount; the client never supplies
  a trusted price. A booking preserves a **pricing snapshot** so historical bookings
  do not change when the current unit rate changes.

## Availability

Server-authoritative. At minimum it considers:

- unit active status and guest capacity
- `CONFIRMED` bookings
- `PENDING_PAYMENT` bookings whose `hold_expires_at` has not passed
- availability blocks

`CANCELED` and `REFUNDED` bookings never block inventory.

`availability_blocks` represent dates where a unit cannot be booked for non-booking
reasons (e.g. maintenance). They are not bookings. Their creation must validate
transactionally that their date range does not overlap an inventory-blocking booking
for the same unit.

## Booking creation and inventory retention (frozen)

- A reservation is created directly as a `bookings` row in `PENDING_PAYMENT`; there is
  no separate hold entity or table.
- `hold_expires_at` retains the unit for exactly 5 minutes. A non-expired
  `PENDING_PAYMENT` booking blocks inventory; an expired one does not.
- Before creating a booking, the transactional RPC first cancels expired
  `PENDING_PAYMENT` bookings for that unit, then creates the new booking. This is the
  primary guarantee that expired rows no longer prevent a valid overlapping claim.
- A scheduled job may cancel expired pending bookings as cleanup only; it is not the
  concurrency guarantee.
- On expiry, the pending booking is auto-`CANCELED`
  (`cancellation_reason = HOLD_EXPIRED`) so availability is released.
- A payment that lands after cancellation is automatically refunded (never confirmed
  against a slot the server can no longer guarantee).

## Booking state machine (frozen)

States: `PENDING_PAYMENT`, `CONFIRMED`, `CANCELED`, `REFUNDED`.

```text
PENDING_PAYMENT ──────────────→ CONFIRMED   (Payment SUCCEEDED via webhook)
PENDING_PAYMENT ──────────────→ CANCELED    (never paid: retention expired, user abandoned, system)
CONFIRMED ───────────────────→ REFUNDED    (full refund completed)
```

Rules:

- A paid booking may never become `CANCELED`; unpaid bookings may never become
  `REFUNDED`. `CANCELED` implies never paid.
- Companion fields: `canceled_at`, `cancellation_reason`
  (`HOLD_EXPIRED | USER_CANCELLED | SYSTEM`).

## Payment state machine (frozen)

`payments` is separate from `booking` and from Stripe state.

States: `CREATED`, `PROCESSING`, `REQUIRES_ACTION`, `SUCCEEDED`, `FAILED`, `REFUNDED`.

- One row per Stripe PaymentIntent (unique PI id); retries create new rows.
- At most one `SUCCEEDED` payment per booking (partial unique index).
- Confirmation is **webhook-authoritative**. The client never confirms a booking from a
  PaymentSheet result. Before confirming, the webhook transaction verifies that the
  booking remains `PENDING_PAYMENT` and that `hold_expires_at` has not passed. If it
  has expired, it cancels the booking and requests a refund. Idempotency: unique
  `stripe_event_id` on processed events; repeated webhooks cause no duplicate side
  effects.

## Cancellation / refund (frozen)

- A confirmed booking can be canceled in-app until **24 hours before property-local
  check-in time** (example: check-in Sep 14 15:00 → deadline Sep 13 15:00).
- Eligible: `CONFIRMED → request cancellation → Stripe refund → Payment REFUNDED →
Booking REFUNDED`.
- Inside the final 24 hours the app offers only contact the property (WhatsApp / Call).
- No partial refunds, penalties, percentages, non-refundable rates or policy tiers.

## Concurrency invariant

> Two guests must never end up with valid overlapping bookings for the same unit and
> date range.

Mechanism (see docs/ARCHITECTURE.md): `btree_gist` + a **partial GiST exclusion
constraint** over `bookings.daterange(check_in, check_out, '[)')` for
`PENDING_PAYMENT` and `CONFIRMED`, enforced by the database. The transactional
creation RPC cancels expired pending bookings for the unit before it inserts. Together,
these rules physically prevent overlapping claims, rather than merely checking them in
application code.

## Booking creation availability (this phase)

The transactional `create_booking` function is implemented, documented and covered by
pgTAP, but it is **revealed to no client role**: `EXECUTE` is granted only to
`service_role`, and the mobile app never calls it. Reservation creation and payment
confirmation stay server-side and are enabled only in the payments (Stripe) phase. The
mobile client must not simulate or fabricate a reservation or a payment.

## Security posture

- `organizations` / `properties` / `units` / localized content / amenities / highlights /
  catalog media: public read for `anon` and `authenticated`, restricted to the active,
  active organization.
- `profiles`: owner-only read/update.
- `bookings`: owner-only read; creation through a parameterized RPC that is not exposed to
  clients yet.
- `payments`: not client-readable (server/webhook only).
- `property_stay_information`: no direct client read; owner-of-CONFIRMED-only via RPC.
- Catalog reads never include Wi-Fi, access codes, arrival instructions or PII.
- Every SECURITY DEFINER function pins `search_path = ''`.
- Stripe secret keys and Supabase service-role keys never exist in the mobile app.
