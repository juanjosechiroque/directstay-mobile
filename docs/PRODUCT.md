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
3. Sign in (`/login`) when private account or booking data is needed.
4. Review the refreshed quote (`/booking/review`) and enter guest details
   (`/booking/guest`); the details remain in memory.
5. Continue to Payment (`/booking/payment`), where the flow stops because checkout is
   unavailable.
6. Signed-in guests can read reservations (`/bookings`, `/bookings/[bookingId]`), open My
   Stay for a confirmed booking (`/stay/[bookingId]`), and view their profile
   (`/profile`), switch language, contact the property, or sign out.

## Available today

- Public localized catalog, licensed media, availability, and quotes.
- Spanish-default and English UI; email/password sign-in for externally provisioned
  accounts.
- Owner-only booking history and confirmed-booking stay and contact information.

A demo account exists for reviewers; credentials are not stored here. Ayni
Hospitality is demo data only.

## Not yet implemented

Mobile reservation creation, Stripe and payments, refunds, in-app cancellation,
self-service sign-up or recovery, and host/admin operations.

DirectStay is not a marketplace, PMS, hotel ERP, channel manager, CRM, housekeeping,
loyalty, smart-lock, ordering, or chat product. It has no purchasable extras or persisted
`Stay`; “My Stay” is derived from a confirmed booking. See [DOMAIN.md](DOMAIN.md) and
[ARCHITECTURE.md](ARCHITECTURE.md).
