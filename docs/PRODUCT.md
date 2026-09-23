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
   this device and requests a pending booking. Payment (`/booking/payment`) shows the
   server-held price and five-minute countdown. “Pagar (demostración)” asks the server to
   confirm the reservation; it makes no charge.
5. Confirmation (`/booking/confirmed`) shows the reservation summary and links to My
   bookings (`/bookings`), booking detail (`/bookings/[bookingId]`) and My Stay
   (`/stay/[bookingId]`). Settings (`/settings`) contains language and brand contact.

## Available today

- Public localized catalog, licensed media, availability, and quotes.
- Spanish-default and English UI; anonymous guest sessions persist on the device.
- Booking creation, demonstration confirmation, owner-only booking history, and
  confirmed-booking stay and contact information.

Ayni Hospitality is reference data only.

## Guest identity decision

Each device keeps its own anonymous Supabase identity, which owns that device's bookings.
There is no login or account recovery on another device. The demonstration checkout sends no email. A future real-payment receipt will prove the
reservation but will not recover the anonymous account.

## Not yet implemented

Stripe and real payments, refunds, in-app cancellation, cross-device account recovery,
and host/admin operations.

DirectStay is not a marketplace, PMS, hotel ERP, channel manager, CRM, housekeeping,
loyalty, smart-lock, ordering, or chat product. It has no purchasable extras or persisted
`Stay`; “My Stay” is derived from a confirmed booking. See [DOMAIN.md](DOMAIN.md) and
[ARCHITECTURE.md](ARCHITECTURE.md).
