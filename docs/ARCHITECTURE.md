# Architecture

## Layers

DirectStay is a React Native (Expo) app backed by Supabase and Stripe. Code that
touches trusted secrets or shared invariants runs server-side.

```text
Mobile app (React Native / Expo Router)
   │
   ├── UI state (React state / React Hook Form)
   ├── server state (TanStack Query)
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

| Capability                           | Where                                     | Why                                            |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| Render screens, forms, navigation    | Mobile                                    | only place with the UI                         |
| Validate form input locally          | Mobile                                    | instant UX feedback (Zod)                      |
| Eventual truth for bookings/payments | PostgreSQL                                | transactional integrity                        |
| Search availability                  | PostgreSQL RPC (`search_available_units`) | server-authoritative, atomic                   |
| Create booking                       | PostgreSQL RPC (`create_booking`)         | single transaction; expires stale pending rows |
| Create PaymentIntent                 | Edge Function                             | needs Stripe secret key                        |
| Confirm booking from payment         | Stripe webhook → Edge Function/RPC        | authoritative; signature verified; idempotent  |
| Refund                               | Edge Function (`refund_payment`)          | needs Stripe secret key; idempotent            |
| Read own bookings                    | PostgreSQL + RLS                          | row-level guest isolation                      |

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
- Device-language auto-detection is intentionally deferred (the app launches in Spanish).
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

## Backend concurrency (bookings)

The hard invariant — no two guests ever hold a valid overlapping claim on the same
unit/date range — is enforced by the database and transactional RPCs:

1. `btree_gist` extension enables equality on `unit_id` inside GiST indexes.
2. The only GiST exclusion constraint for booking overlaps is on `bookings`:
   `EXCLUDE USING gist (unit_id WITH =, date_range WITH &&)
WHERE (status IN ('PENDING_PAYMENT','CONFIRMED'))`
   where `date_range` is a generated `daterange(check_in, check_out, '[)')`.
3. `create_booking` first cancels expired `PENDING_PAYMENT` bookings for the requested
   unit, then inserts the new `PENDING_PAYMENT` booking with `hold_expires_at` set to
   exactly five minutes after creation. Therefore, only a non-expired pending booking
   or a confirmed booking retains inventory. A second overlapping insert raises
   constraint error `23P01`, which the API maps to "unavailable".
4. A scheduled job may cancel expired pending bookings as cleanup, but it is not the
   primary protection against overlaps.
5. Creation of an `availability_blocks` row runs transactionally and validates its
   date range against inventory-blocking bookings for the same unit. Blocks remain a
   separate model; they do not share the booking exclusion constraint.
6. The payment webhook re-validates, in its transaction, that the booking is still
   `PENDING_PAYMENT` and its `hold_expires_at` has not passed before changing it to
   `CONFIRMED`. If the retention expired, it cancels the booking and requests a refund.

This behavior is demoed with two devices / concurrent requests.
