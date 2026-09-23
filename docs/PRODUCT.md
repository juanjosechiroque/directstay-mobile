# Product

DirectStay gives an accommodation brand its own booking channel, avoiding intermediary
commissions and maintaining a direct relationship with guests. It supports brands that
sell **unique units** and combines public discovery with secure reservation and stay
information.

## Audience

It serves multi-property brands and guests who return or combine locations. For a very
small independent property, acquisition fits the web better; the app is stronger for
recurrence and “My Stay.”

## Guest journey

1. Browse active properties and units on Home (`/`).
2. Search dates and party size (`/search`), then inspect a unit (`/units/[unitId]`).
3. Review the refreshed quote (`/booking/review`) and enter guest details
   (`/booking/guest`); the details remain in memory.
4. When the guest continues, the app creates or reuses an anonymous Supabase session on
   this device, then opens Payment (`/booking/payment`), where the flow stops because
   checkout is unavailable.
5. Guests can read reservations (`/bookings`, `/bookings/[bookingId]`) and open My Stay for
   a confirmed booking (`/stay/[bookingId]`). Settings (`/settings`) contains the
   language selector and brand contact.

## Available today

- Public localized catalog, licensed media, availability, and quotes.
- Spanish-default and English UI; anonymous guest sessions persist on the device.
- Owner-only booking history and confirmed-booking stay and contact information.

Ayni Hospitality is reference data only.

## Guest identity decision

Each device keeps its own anonymous Supabase identity, which owns that device's bookings.
There is no login or account recovery on another device. When booking creation and payment
are implemented, an email confirmation will serve as the guest's receipt and proof of the
reservation; it will not recover the anonymous account.

## Not yet implemented

Mobile reservation creation, Stripe and payments, refunds, in-app cancellation,
cross-device account recovery, and host/admin operations.

DirectStay is not a marketplace, PMS, hotel ERP, channel manager, CRM, housekeeping,
loyalty, smart-lock, ordering, or chat product. It has no purchasable extras or persisted
`Stay`; “My Stay” is derived from a confirmed booking. See [DOMAIN.md](DOMAIN.md) and
[ARCHITECTURE.md](ARCHITECTURE.md).
