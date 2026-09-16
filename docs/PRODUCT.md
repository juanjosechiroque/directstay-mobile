# Product

## Statement

DirectStay is a mobile direct-booking and guest-stay experience for independent
accommodations, allowing guests to check real availability, securely reserve and pay
for a unit, and access essential stay information directly from their phone.

## Business hierarchy

Generic and reusable:

```text
Organization
    ↓
Property
    ↓
Unit
```

Examples: Ayni Hospitality → Ayni Mountain Cabins → Killa Cabin;
Costa Hotels → Costa Hotel Miraflores → Room 204.

`Unit` means: a bookable accommodation unit. This document does not model the domain
around cabins or rooms.

## Scope

- Public brand catalog: one organization with one or more properties
- Property presentation; unit presentation; localized content and catalog media
- Date selection; guest count; server-authoritative availability search
- Sign-in and sign-out for accounts provisioned outside the mobile app
- Booking history; booking details (reads)
- Pre-arrival information; directions; simple stay information (owner + confirmed only)
- WhatsApp contact; phone contact
- Spanish UI; i18n-ready architecture

## Current phase

Available today:

- The catalog, property/unit detail and availability search are **public** (no sign-in).
- Creating, viewing or managing a booking requires an email + password account.
- My Bookings and My Stay read real account data; My Stay shows Wi-Fi/arrival information
  only for a confirmed booking owned by the signed-in guest.

Deliberately not enabled yet:

- Payments, booking creation and booking confirmation. The app states this clearly and
  never fakes a charge, a confirmation or a reservation. In-app cancellation (which
  triggers a refund) is likewise not enabled; guests are directed to contact the property.
- Self-service account registration and password recovery. Accounts and passwords are
  provisioned outside the mobile app through Supabase administration.

## Explicit exclusions

Not a marketplace, destination-search platform, PMS, hotel ERP, channel manager,
host/admin/housekeeping/service-request app, CRM, review/loyalty/promotions engine,
smart-lock product, restaurant-ordering app, or internal chat.

## No extras

No `Extra` / `BookingExtra` entities and no purchasable add-ons (breakfast add-ons,
transfers, firewood, wine packages, post-booking payments). Breakfast exists only as
informational stay content.

## My Stay experience

No persisted `Stay` table. The stay experience is derived from a confirmed booking plus
the property's **private stay information** (Wi-Fi, breakfast, arrival directions),
readable only by the authenticated owner of that confirmed booking through a secure RPC.
It is deliberately simple: Wi-Fi, breakfast info, checkout info, and contact actions
(WhatsApp / Call). No operational requests.

## Demo business

The demo/reference brand is the fictional **Ayni Hospitality**, with two properties:
**Ayni Mountain Cabins** (Sacred Valley / Urubamba, units Killa, Inti, Wayra, Sumaq) and
**Ayni Cusco** (historic centre, units Sisa, Illapa). All demo information is fictional and
is used for seed data, screenshots and testing only. It must never be hardcoded into
reusable domain logic.
