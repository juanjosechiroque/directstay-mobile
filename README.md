# DirectStay

DirectStay is a mobile direct-booking and guest-stay application for independent
accommodation businesses (cabins, lodges, boutique hotels, and short-stay apartments).

Guests explore a brand's properties, check real availability, sign in to manage bookings,
and access essential stay information from their phone. The app is a public catalog plus an
authenticated guest area — not a marketplace, PMS or hotel ERP.

## Stack

- React Native + Expo (SDK 57) + Expo Router
- TypeScript (strict)
- i18n: i18next + react-i18next (Spanish default, i18n-ready)
- Server state: TanStack Query
- Backend: Supabase (Postgres, Auth, RLS, RPC, Storage)
- Testing: Jest + jest-expo (app), pgTAP (database)
- Lint/format: ESLint (`expo lint`) + Prettier
- CI: GitHub Actions

## Demo business

The reference/demo brand is the **fictional** **Ayni Hospitality**, with two properties:
**Ayni Mountain Cabins** (Sacred Valley, Urubamba; units Killa, Inti, Wayra, Sumaq) and
**Ayni Cusco** (historic centre; units Sisa, Illapa). All demo information is fictional;
it exists as seed data only and must never be reused as domain logic.

## Prerequisites

- **Node.js 24** (required; pinned by `.nvmrc`).
- **A Supabase project to point at** — everyday development targets the hosted
  `directstay` development project directly; no local install is required to run the app.
- **Docker + Supabase CLI** (`brew install supabase/tap/supabase`) — only needed if you're
  authoring migrations or running the pgTAP suite against a disposable local database.

```bash
nvm use            # Node 24
npm install
```

## Configuration

Copy the example environment file and fill it in:

```bash
cp .env.example .env
```

| Variable                        | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`           | `local` \| `development` \| `preview` \| `production`   |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase project URL                                    |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public by design; RLS protects)      |
| `EXPO_PUBLIC_ORGANIZATION_SLUG` | Which brand this deployment serves (`ayni-hospitality`) |

Only `EXPO_PUBLIC_*` variables are inlined into the client bundle. **Never** put the
Supabase service-role key or a Stripe secret key behind that prefix. Missing values fail at
startup with a clear message (`src/lib/supabase/config.ts`).

## Run the app (remote Supabase)

Everyday development points `.env` at the hosted development project — get the URL and
anon key from the Supabase dashboard (Project Settings > API) and set
`EXPO_PUBLIC_APP_ENV=development`. Then:

```bash
npm start                      # Expo dev server
```

Schema, RLS/RPC and seed data live in this repo (`supabase/migrations`, `supabase/seed.sql`)
and are applied to the remote project with the Supabase CLI:

```bash
supabase link --project-ref <ref>     # once per machine
supabase db push                      # apply pending migrations
supabase db push --include-seed       # also (re)apply supabase/seed.sql
```

The mobile app allows sign-in only: create test users through Supabase Studio (dashboard)
or another administrative process.

## Optional: local Supabase stack

Running Supabase locally is only needed to author/verify migrations and RLS with a
disposable database, or to run the pgTAP suite. It is not required to run the app day to
day.

```bash
supabase start                 # starts Postgres, Auth, Storage, Studio
supabase status                # or: supabase status -o env
supabase db reset              # applies all migrations, then supabase/seed.sql
```

Copy the printed `API URL` and `anon key` into `.env` (`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_ENV=local`) only if you want the app
itself to run against this disposable instance instead of the remote one.

## Testing

```bash
npm run typecheck
npm run lint
npm run test:ci                # app/unit tests (Jest)
npm run format:check

# Requires Docker + the local Supabase stack (see above) — not required for app dev.
supabase db reset               # fresh schema + seed for a disposable local database
supabase test db                # database tests (pgTAP)
```

The database suites cover schema shape, domain invariants, concurrency, profiles, RLS and
grants, the public catalog and availability RPC, private stay information, and the
prepared-but-not-exposed `create_booking` function.

## Environments

| Environment | Supabase project                          | Use                            |
| ----------- | ----------------------------------------- | ------------------------------ |
| Development | Remote development project (`directstay`) | Everyday development (default) |
| Local       | Local stack (`supabase start`, optional)  | Schema/RLS authoring, pgTAP    |
| Preview     | Isolated preview project                  | Pre-release review             |
| Production  | Production project                        | Real guests                    |

Each environment has its own project and its own `EXPO_PUBLIC_*` values (kept in the
deployment/EAS environment, never in git). Accounts are provisioned outside the app in
each environment; self-service sign-up and password recovery are disabled in both the
mobile UI and Supabase configuration.

`app.config.ts` resolves the visible app name and bundle id from `EAS_BUILD_PROFILE`:

| Profile     | Name               | Bundle / package                          |
| ----------- | ------------------ | ----------------------------------------- |
| development | DirectStay Dev     | `com.juanjosechiroque.directstay.dev`     |
| preview     | DirectStay Preview | `com.juanjosechiroque.directstay.preview` |
| production  | DirectStay         | `com.juanjosechiroque.directstay`         |

Deep-link scheme: `directstay`.

## Images, licensing and attribution

- Catalog media is served from the public-read `catalog-media` storage bucket. No client
  role can write or delete objects; uploads happen out of band.
- Every image stores `source_url`, `author`, `license`, `attribution_text`,
  `license_verified_at` and `verification_note`, plus localized `alt_text`.
- Accepted licenses: **CC0, public domain, CC BY, CC BY-SA, or a compatible commercial
  license**. Each image requires an origin URL and, when applicable, attribution text.
- The current seed ships **placeholders** with `license = NULL` and a verification note;
  the app renders a local gradient instead of presenting an unverified asset. Loading real,
  licensed photography is a tracked pending task.

## Excluded scope

Not in this phase (and intentionally absent from the client):

- Stripe, real payments, PaymentIntent creation or secret keys
- Booking creation, payment confirmation and any fake/simulated success
- In-app cancellation and refunds
- Self-service account registration and password recovery
- Marketplace, PMS, hotel ERP, extras, chat, CRM or housekeeping features

`create_booking` is implemented and tested in PostgreSQL but `EXECUTE` is granted only to
`service_role`; the mobile app cannot create or confirm a booking.

## Documentation

- `docs/PRODUCT.md` — product scope and boundaries
- `docs/DOMAIN.md` — domain model, invariants, state machines
- `docs/ARCHITECTURE.md` — layers, session flow, RLS/RPC boundaries

## Project structure

```
app.config.ts        # build-profile-driven Expo config
src/
  app/               # Expo Router routes (thin)
  features/          # screens, components, queries, repositories, types
  lib/               # query client, errors, dates, formatting, supabase layer
  i18n/              # i18next setup + locale files
  mocks/             # test-only fixtures and mock adapters (never runtime)
supabase/
  migrations/        # incremental SQL migrations
  seed.sql           # fictional demo data
  tests/database/    # pgTAP suites
docs/                # engineering/product docs
```

## License

None yet — private portfolio project. The template MIT license was removed.
