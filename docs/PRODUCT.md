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

## V1 scope

- Property presentation; unit presentation
- Date selection; guest count; availability search
- Booking review; booking hold; payment; booking confirmation
- Booking history; booking details; simple cancellation; Stripe refund
- Pre-arrival information; directions; simple stay information
- WhatsApp contact; phone contact
- Notifications; deep links
- Spanish UI; i18n-ready architecture

## Explicit exclusions

Not a marketplace, destination-search platform, PMS, hotel ERP, channel manager,
host/admin/housekeeping/service-request app, CRM, review/loyalty/promotions engine,
smart-lock product, restaurant-ordering app, or internal chat.

## V1 has no extras

No `Extra` / `BookingExtra` entities and no purchasable add-ons (breakfast add-ons,
transfers, firewood, wine packages, post-booking payments). Breakfast exists only as
informational stay content.

## My Stay experience

No persisted `Stay` table in V1. The stay experience is derived from a confirmed
booking plus property-local time. It is deliberately simple: Wi-Fi, breakfast info,
checkout info, and contact actions (WhatsApp / Call). No operational requests.

## Demo business

The demo/reference property is the fictional **Ayni Mountain Cabins** (Ayni
Hospitality), Sacred Valley, Cusco, Peru, with the units Killa, Inti, Wayra and Sumaq.
All demo information is fictional and is used for seed data, screenshots and testing
only. It must never be hardcoded into reusable domain logic.
