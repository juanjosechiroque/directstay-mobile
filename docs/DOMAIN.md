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
booking_holds
bookings
payments
```

Relationships:

```text
auth.users → profiles → bookings → payments
organizations → properties → units → {unit_images, availability_blocks, booking_holds, bookings}
```

No `stays`, `extras`, `booking_extras`, `service_requests`, `reviews`, `host_chat`,
`housekeeping` tables in V1.

## Dates and timezone (frozen)

- Booking intervals use `[checkIn, checkOut)`: check-in inclusive, check-out exclusive.
  Same-day turnover is allowed (existing booking Sep 10→12; new booking Sep 12→14 is OK).
- `check_in` / `check_out` are business `DATE`s in the property timezone, not global
  timestamps. Overlap logic uses ranges: `daterange(check_in, check_out, '[)')`.
- `properties` stores its timezone as data (`America/Lima` for the demo) and its
  check-in/check-out times and currency. Demo config: check-in 15:00, checkout 12:00,
  USD. These are property data, not hardcoded domain values.
- Holding expiration is stored as `timestamptz` (`created_at + 5 minutes`).

## Money and pricing (frozen)

- Persist money in integer minor units (USD 120.00 → `12000`) plus a `currency` column.
  Column naming convention: `*_minor` (e.g. `nightly_rate_minor`, `total_amount_minor`).
  Never floating point.
- V1 pricing: `nightly rate × number of nights`. No taxes, fees, discounts, promotions,
  loyalty, dynamic or occupancy pricing.
- The server is authoritative over the final payable amount; the client never supplies
  a trusted price. A booking preserves a **pricing snapshot** so historical bookings
  do not change when the current unit rate changes.

## Availability

Server-authoritative. At minimum it considers:

- unit active status and guest capacity
- confirmed bookings
- active non-expired booking holds
- unpaid, non-canceled bookings (`PENDING_PAYMENT`)
- availability blocks

`availability_blocks` represent dates where a unit cannot be booked for non-booking
reasons (e.g. maintenance). They are not bookings.

## Booking hold (frozen)

- Duration: exactly 5 minutes. States: `ACTIVE`, `CONSUMED`, `EXPIRED`, `RELEASED`.
- Only `ACTIVE` holds prevent another valid overlapping hold or booking for the same.
- A bookings row is created **in the same transaction as the hold**
  (`booking_holds.booking_id`, UNIQUE → one booking per hold).
- When a hold expires, its `PENDING_PAYMENT` booking is auto-`CANCELED`
  (`cancellation_reason = HOLD_EXPIRED`) so availability is released.
- A payment that lands after cancellation is automatically refunded (never confirmed
  against a slot the server can no longer guarantee).

## Booking state machine (frozen)

States: `PENDING_PAYMENT`, `CONFIRMED`, `CANCELED`, `REFUNDED`.

```text
PENDING_PAYMENT ──────────────→ CONFIRMED   (Payment SUCCEEDED via webhook)
PENDING_PAYMENT ──────────────→ CANCELED    (never paid: hold expired, user abandoned, system)
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
  PaymentSheet result. Idempotency: unique `stripe_event_id` on processed events;
  repeated webhooks cause no duplicate side effects.

## Cancellation / refund (frozen)

- A confirmed booking can be canceled in-app until **24 hours before property-local
  check-in time** (example: check-in Sep 14 15:00 → deadline Sep 13 15:00).
- Eligible: `CONFIRMED → request cancellation → Stripe refund → Payment REFUNDED →
Booking REFUNDED`.
- Inside the final 24 hours the app offers only contact the property (WhatsApp / Call).
- V1 has no partial refunds, penalties, percentages, non-refundable rates or policy tiers.

## Concurrency invariant

> Two guests must never end up with valid overlapping bookings for the same unit and
> date range.

Mechanism (see docs/ARCHITECTURE.md): `btree_gist` + **partial GiST exclusion
constraints** over `daterange` on both `booking_holds` (active) and `bookings`
(`PENDING_PAYMENT` / `CONFIRMED`), enforced by the database. Combined with "one
booking per hold" and "a booking is only created under an ACTIVE hold", overlapping
claims are physically prevented, not merely checked in application code.

## Security posture

- `profiles`: owner-only read/update.
- `bookings`: owner-only read; creation through parameterized RPCs under RLS.
- `payments`: not client-readable (server/webhook only).
- Property/unit catalog: readable by authenticated guests; mutations service-role/RPC only.
- Stripe secret keys and Supabase service-role keys never exist in the mobile app.
