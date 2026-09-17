# Architecture

## Layers

DirectStay is a React Native (Expo) app backed by Supabase and (later) Stripe. Code that
touches trusted secrets or shared invariants runs server-side.

```text
Mobile app (React Native / Expo Router)
   │
   ├── UI state (React state / forms / booking draft)
   ├── server state (TanStack Query)
   ├── repositories (feature contracts, injected at the root)
   │
Supabase
   ├── PostgreSQL (schema, constraints, RLS, RPC)
   ├── Auth (email + password)
   ├── Storage (public-read `catalog-media`)
   └── Edge Functions (Stripe-secret operations — later)
Stripe
   ├── PaymentIntent + PaymentSheet (client via publishable key — later)
   └── Webhooks (validated signature, idempotent — later)
```

The mobile app is a **client of the public catalog**. It reads a narrow, server-authored
read model and never holds a secret or a service-role key.

## Who does what

| Capability                           | Where                                      | Why                                            |
| ------------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| Render screens, forms, navigation    | Mobile                                     | only place with the UI                         |
| Validate form input locally          | Mobile                                     | instant UX feedback (Zod-free validators)      |
| Eventual truth for bookings/payments | PostgreSQL                                 | transactional integrity                        |
| Public catalog + property/unit copy  | PostgreSQL RPC (`get_catalog`, `get_unit`) | server-scoped to the active organization       |
| Search availability                  | PostgreSQL RPC (`search_available_units`)  | server-authoritative, atomic                   |
| Private stay information             | PostgreSQL RPC (`get_stay_information`)    | owner + `CONFIRMED` only                       |
| Create booking                       | PostgreSQL RPC (`create_booking`)          | single transaction; **not exposed to clients** |
| Create PaymentIntent                 | Edge Function                              | needs Stripe secret key (later)                |
| Confirm booking from payment         | Stripe webhook → Edge Function/RPC         | authoritative; signature verified; idempotent  |
| Refund                               | Edge Function (`refund_payment`)           | needs Stripe secret key; idempotent (later)    |
| Read own bookings                    | PostgreSQL + RLS                           | row-level guest isolation                      |

## Data layer boundaries

```text
Screen (feature)  →  TanStack Query hook  →  Repository interface  →  Supabase adapter
```

- **Screens** render state and call hooks. They never import `@supabase/supabase-js`.
- **Query hooks** own cache keys and invalidation. Keys include locale, unit, date range,
  guests and (when relevant) the user, so results never mix contexts.
- **Repository interfaces** live in each feature (`features/*/repository`). They express
  use-cases, not raw rows, and are the only thing screens depend on.
- **Supabase adapters** call RPCs and owner-scoped tables, then map payloads to domain
  models through validating mappers (`src/lib/supabase/mappers.ts`).
- The **composition root** (`src/lib/supabase/repositories.ts`) builds every adapter from
  one client and one organization slug. Swapping implementations is a single change.
- Mocks exist **only** for unit tests of repositories/adapters. The runtime composition
  never imports `src/mocks`; a static test enforces this.

## Session flow

1. `SessionProvider` subscribes to `supabase.auth.onAuthStateChange` and exposes
   `loading | signedIn | signedOut` plus the current user.
2. The catalog and availability are public: they load with or without a session.
3. Profile, bookings and stay are guarded by navigation (`useSessionGuard`), not by hidden
   buttons. A deep link to a protected route redirects to `/login?redirect=…`.
4. The redirect target is sanitized: internal paths only, and never PII or tokens.
5. On `SIGNED_IN` / `SIGNED_OUT`, identity-scoped caches (profile, bookings, stay) are
   cleared so one account's data can never flash for another. Public caches stay.

## anon vs authenticated

- **anon** (a visitor, no `auth.users` row): public catalog, unit detail, availability
  search and sign-in. No Anonymous Auth or self-service registration is used.
- **authenticated**: everything anon can do, plus owner-only profile, bookings and private
  stay information for a `CONFIRMED` booking.
- RLS and the RPCs enforce this on the server. The client guard is UX, not the boundary.

## Single organization, multiple properties

One deployment serves one brand (`EXPO_PUBLIC_ORGANIZATION_SLUG`). That brand can have many
properties, each with many units. Every public RPC takes the organization slug and filters
`organizations.is_active`, `properties.is_active` and `units.is_active` server-side; the
client cannot widen the scope. The home screen lists all active properties and their units.

## Catalog vs private information

- The public read model (catalog, unit, availability) is assembled by SECURITY DEFINER RPCs
  pinned to the active organization. It contains no Wi-Fi, access codes, arrival
  instructions or PII.
- `property_stay_information` has RLS enabled with no client policy and no grants. The only
  read is `get_stay_information(booking_id)`, which checks `auth.uid()` owns a `CONFIRMED`
  booking. The public `search_available_units` RPC is the single source of availability and
  pricing, so there is no divergent client-side availability algorithm.

## Server authority and RPC

- Pricing and the payable amount are computed in SQL from the unit's current rate; the
  client never supplies a trusted price.
- Availability considers unit/capacity/active state, `CONFIRMED` bookings, non-expired
  `PENDING_PAYMENT` holds and `availability_blocks`.
- Booking creation and payment confirmation are **not exposed to the mobile client** in
  this phase. `create_booking` exists, is transactional, and is covered by pgTAP, but
  `EXECUTE` is granted only to `service_role`. The payment screen clearly states that
  payment is not enabled instead of showing a fake success.

## App structure

```
src/
  app/          # Expo Router routes (thin: they render feature screens)
  features/     # feature modules: screens, components, queries, repository, types
  lib/          # query client, errors, dates, formatting, i18n-agnostic primitives
  lib/supabase/ # client, config, mappers, error mapping, repository factory
  i18n/         # i18next init + locale files
  mocks/        # test-only fixtures and mock repository adapters
```

## i18n

- All user-facing strings go through i18next. Spanish (`es`) is the default locale.
- `src/i18n/locales/{es,en}.json`; screens never hardcode copy.
- A locale-parity test fails CI if `es` and `en` drift apart.
- Error codes (`AppErrorCode`) are translated in the same layer, so failures are safe and
  localized.

## Environments and configuration

`app.config.ts` resolves name + bundle identifier from `EAS_BUILD_PROFILE`:

| Profile     | Bundle id                                 |
| ----------- | ----------------------------------------- |
| development | `com.juanjosechiroque.directstay.dev`     |
| preview     | `com.juanjosechiroque.directstay.preview` |
| production  | `com.juanjosechiroque.directstay`         |

Public configuration is validated at startup (`src/lib/supabase/config.ts`):

```
EXPO_PUBLIC_APP_ENV=local|development|preview|production
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ORGANIZATION_SLUG=ayni-hospitality
```

Only `EXPO_PUBLIC_*` vars reach the bundle. A missing value fails immediately with a clear
screen. Each environment points at its own Supabase project; everyday development targets
the hosted `directstay` development project directly (see README). The local stack from
`supabase start`/`supabase status` is optional tooling for authoring migrations/RLS and
running the pgTAP suite against a disposable database — it is not required to run the app.
Accounts are provisioned outside the mobile app; the app exposes neither sign-up nor
password-recovery flows.

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
