# Domain

This document records the DirectStay domain model and its invariants. Anything
that changes these rules must update this document first.

## Model

```text
organizations
properties
units
unit_images
availability_blocks
profiles
bookings
payments
```

Relationships:

```text
auth.users → profiles → bookings → payments
organizations → properties → units → {unit_images, availability_blocks, bookings}
```

No `stays`, `extras`, `booking_extras`, `service_requests`, `reviews`, `host_chat`,
`housekeeping` tables.

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

## Security posture

- `profiles`: owner-only read/update.
- `bookings`: owner-only read; creation through parameterized RPCs under RLS.
- `payments`: not client-readable (server/webhook only).
- Property/unit catalog: readable by authenticated guests; mutations service-role/RPC only.
- Stripe secret keys and Supabase service-role keys never exist in the mobile app.
