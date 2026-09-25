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

1. Browse active properties on Home (`/`), then open a property
   (`/properties/[propertyId]`) to see its units, address, phone and compact Google Maps
   and contact links.
2. Choose a property for every availability search (`/search`), enter dates and party
   size, then inspect a unit (`/units/[unitId]`). Entering search from a property or unit
   keeps its property selected; results never mix properties. Dates start empty. The calendar opens
   at today in the selected property's timezone, offers a Today shortcut for check-in,
   and choosing check-in suggests the next day for check-out. Guest selection stops at the
   largest unit capacity in that property.
3. Review the refreshed quote (`/booking/review`) and enter guest details and an optional
   special request (`/booking/guest`). An optional phone uses a selectable international
   code and is sent as one full number; details remain in memory until booking creation.
4. When the guest continues, the app creates or reuses an anonymous Supabase session on
   this device and requests a pending booking. Payment (`/booking/payment`) shows the
   server-held price, an explanation of the temporary unit hold, and the five-minute
   countdown. An unexpired pending booking can also
   return to Payment from its booking detail. “Pagar (demostración)” asks the server to
   confirm the reservation; it makes no charge.
5. Confirmation (`/booking/confirmed`) shows the reservation summary, offers an editable
   native calendar form for confirmed stays, and links to My
   bookings (`/bookings`), booking detail (`/bookings/[bookingId]`) and My Stay
   (`/stay/[bookingId]`). Language (ES/EN) is switched from a compact control on Home and persisted on the device.

## Available today

- Public localized catalog, licensed media, availability, and quotes.
- Spanish-default and English UI; anonymous guest sessions persist on the device.
- Booking creation, demonstration confirmation, owner-only booking history, and
  confirmed-booking stay and contact information.
- Add a confirmed stay to the device calendar through the operating system's event form.

Ayni Hospitality is reference data only. Its mobile contact numbers are placeholders.
The WhatsApp action opens a prepared inquiry and asks the guest to choose a recipient;
direct chat with a property requires a verified WhatsApp number before real use.

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
