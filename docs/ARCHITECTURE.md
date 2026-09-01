# Architecture

## Layers

DirectStay is a React Native (Expo) app backed by Supabase and Stripe. Code that
touches trusted secrets or shared invariants runs server-side.

```text
Mobile app (React Native / Expo Router)
   │
   ├── UI state (React state / React Hook Form)
   ├── server state (TanStack Query; introduced with the backend phases)
   │
Supabase
   ├── PostgreSQL (schema, constraints, RLS, RPC)
   ├── Storage (property/unit images)
   └── Edge Functions (Stripe-secret operations)
Stripe
   ├── PaymentIntent + PaymentSheet (client via publishable key)
   └── Webhooks (validated signature, idempotent)
```

## Who does what

| Capability                           | Where                                     | Why                                           |
| ------------------------------------ | ----------------------------------------- | --------------------------------------------- |
| Render screens, forms, navigation    | Mobile                                    | only place with the UI                        |
| Validate form input locally          | Mobile                                    | instant UX feedback (Zod)                     |
| Eventual truth for bookings/payments | PostgreSQL                                | transactional integrity                       |
| Search availability                  | PostgreSQL RPC (`search_available_units`) | server-authoritative, atomic                  |
| Create booking hold + booking        | PostgreSQL RPC (`create_booking_hold`)    | single transaction; exclusion constraints     |
| Create PaymentIntent                 | Edge Function                             | needs Stripe secret key                       |
| Confirm booking from payment         | Stripe webhook → Edge Function/RPC        | authoritative; signature verified; idempotent |
| Refund                               | Edge Function (`refund_payment`)          | needs Stripe secret key; idempotent           |
| Read own bookings                    | PostgreSQL + RLS                          | row-level guest isolation                     |

Not every backend operation becomes an Edge Function: plain reads stay in the client
through RLS; multi-record transactional operations live in PostgreSQL RPCs; only
Stripe-secret operations live in Edge Functions.

## App structure

```
src/
  app/          # Expo Router routes (file-based)
  i18n/         # i18next init + locale files
  (later) features/      # feature-scoped modules (booking, stay, profile)
  (later) lib/           # api clients, query client, formatting
```

## i18n

- All user-facing strings go through i18next. Spanish (`es`) is the default locale.
- `src/i18n/locales/{es,en}.json`; screens never hardcode copy.
- Device-language auto-detection is intentionally deferred (V1 launches in Spanish).
- A locale-parity test fails CI if `es` and `en` drift apart.

## Environments

`app.config.ts` resolves name + bundle identifier from `EAS_BUILD_PROFILE`:

| Profile     | Bundle id                                 |
| ----------- | ----------------------------------------- |
| development | `com.juanjosechiroque.directstay.dev`     |
| preview     | `com.juanjosechiroque.directstay.preview` |
| production  | `com.juanjosechiroque.directstay`         |

Deep-link scheme: `directstay`. EAS profiles are in `eas.json`.
Only `EXPO_PUBLIC_*` vars reach the client bundle; secrets never use that prefix.

## Backend concurrency (booking holds)

The hard invariant — no two guests ever hold a valid overlapping claim on the same
unit/date range — is enforced by the database:

1. `btree_gist` extension enables equality on `unit_id` inside GiST indexes.
2. Partial exclusion constraints:
   - `booking_holds`: `EXCLUDE USING gist (unit_id WITH =, date_range WITH &&)
WHERE (status = 'ACTIVE')`
   - `bookings`: `EXCLUDE USING gist (unit_id WITH =, date_range WITH &&)
WHERE (status IN ('PENDING_PAYMENT','CONFIRMED'))`
     where `date_range` is a generated `daterange(check_in, check_out, '[)')`.
3. `booking_holds.booking_id` is UNIQUE (one booking per hold), and a booking can only
   be created under a currently-ACTIVE hold in the same transaction. By induction, a
   confirmed booking can never overlap another guest's claim; a second overlapping
   `ACTIVE` insert raises constraint error `23P01`, which the API maps to "unavailable".
4. The final race (payment lands after hold expiry) is closed in the webhook handler:
   re-validate the slot under a transaction; on conflict, auto-refund.

This is documented in detail when the booking-holds phase ships, and demoed with two
devices / concurrent requests.
