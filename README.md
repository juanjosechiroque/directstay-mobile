# DirectStay

DirectStay is a mobile direct-booking and guest-stay application for independent
accommodation businesses (cabins, lodges, boutique hotels, and short-stay apartments).

Guests explore a brand's properties, choose one property to check availability, make a demonstration booking,
and use an anonymous device session to access their bookings and stay information. No
charge is made by the demonstration payment button. The app is a
public catalog and guest area — not a marketplace, PMS or hotel ERP.

## Stack

- React Native + Expo (SDK 57) + Expo Router
- TypeScript (strict)
- i18n: i18next + react-i18next (Spanish default, i18n-ready)
- Server state: TanStack Query
- Backend: Supabase (Postgres, Auth, RLS, RPC, Storage)
- Testing: Jest + jest-expo (app), pgTAP (database)
- Lint/format: ESLint (`expo lint`) + Prettier
- CI: GitHub Actions

## Reference business

The reference brand is the **fictional** **Ayni Hospitality**, with two properties:
**Ayni Mountain Cabins** (Sacred Valley, Urubamba; units Killa, Inti, Wayra, Sumaq) and
**Ayni Cusco** (historic centre; units Sisa, Illapa). The business and accommodation
details are fictional reference data and must never be reused as domain logic. Google
Maps on each property page and Google Maps links point to real public plazas in Cusco and
Urubamba as approximate references, not to verified accommodation addresses.

## Prerequisites

- **Node.js 24** (required; pinned by `.nvmrc`).
- **A Supabase project to point at** — everyday development targets the hosted
  `directstay` development project after the migration is applied.
- **Supabase CLI** (`brew install supabase/tap/supabase`) — for applying migrations to
  the hosted development project.

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
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase project URL                                    |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public by design; RLS protects)      |
| `EXPO_PUBLIC_ORGANIZATION_SLUG` | Which brand this deployment serves (`ayni-hospitality`) |

Only `EXPO_PUBLIC_*` variables are inlined into the client bundle. **Never** put the
Supabase service-role key or a Stripe secret key behind that prefix. Missing values fail at
startup with a clear message (`src/lib/supabase/config.ts`).

## Run the app (remote Supabase)

Everyday development points `.env` at the hosted development project — get the URL and
anon key from the Supabase dashboard (Project Settings > API). Then:

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

For the hosted Supabase project, enable **Anonymous Sign-Ins** in **Supabase Dashboard →
Authentication → Sign In / Providers**. Also allow new users at the Auth level: Supabase's
anonymous signup endpoint requires the global signup gate. Keep the email provider's
**Enable Email Signup** off. After applying the migrations, run `npm run ios`, choose a
property, search future dates, open a unit, review, enter guest details and an optional
special request, press “Pagar (demostración)”, then open the booking detail and My Stay.
An unexpired pending booking can return to the demonstration payment from its detail.
The confirmation button makes no charge. Apply the migrations before using a client
build that sends special requests.

## Testing

Run `npm run format` to apply ESLint fixes and Prettier formatting together. The checks
below do not change files.

```bash
npm run typecheck
npm run lint
npm run test:ci                # app/unit tests (Jest)
npm run format:check
```

CI database suites cover schema shape, domain invariants, concurrency, profiles, RLS and
grants, anonymous guest ownership, the public catalog and availability RPC, private stay
information, authenticated booking creation and demonstration confirmation.

## Environments

| Environment | Supabase project                          | Use                            |
| ----------- | ----------------------------------------- | ------------------------------ |
| Development | Remote development project (`directstay`) | Everyday development (default) |
| Preview     | Isolated preview project                  | Pre-release review             |
| Production  | Production project                        | Real guests                    |

Each environment has its own project and its own `EXPO_PUBLIC_*` values (kept in the
deployment/EAS environment, never in git). Guest identities are created anonymously by
the app and persist on the current device. Cross-device recovery is not supported.

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
- The seed ships real, CC BY / CC BY-SA licensed photos (sourced from Wikimedia Commons,
  credited in `attribution_text`) for every property and unit, including both of Killa's
  slots. The app renders a local gradient instead of presenting an unverified asset
  whenever a path doesn't resolve or a future slot has no licensed asset yet.
- To add or replace a photo on an existing property/unit row, use
  `scripts/ingest-catalog-photo.sh` (macOS only — needs `sips`). It resizes/compresses the
  image, uploads it to `catalog-media`, and updates that row's license/author/source/
  attribution and localized `alt_text` in one step. It never creates properties or units;
  create the row first (seed or Studio), then run the script with `--table`, `--id` and
  `--storage-path`. Requires `SUPABASE_SERVICE_ROLE_KEY` exported for that shell only —
  never commit it. See the script header for the full flag list.

## Excluded scope

Not yet implemented (and intentionally absent from the client):

- Stripe, real payments, PaymentIntent creation or secret keys
- In-app cancellation and refunds
- Cross-device account recovery and identity linking
- Marketplace, PMS, hotel ERP, extras, chat, CRM or housekeeping features

`create_booking` and `confirm_demo_payment` run on PostgreSQL for authenticated anonymous
guests. The server confirms demonstration bookings; Stripe integration will replace that
confirmation path for real payments.

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
  **/__tests__/      # Jest tests with fake repositories local to each test
supabase/
  migrations/        # incremental SQL migrations
  seed.sql           # fictional demo data
  tests/database/    # pgTAP suites
docs/                # engineering/product docs
```

## License

MIT. See [LICENSE](LICENSE).

The local WhatsApp icon in `assets/images/whatsapp-bootstrap.png` and the phone icon in
`assets/images/phone-bootstrap.png` come from
[Bootstrap Icons](https://icons.getbootstrap.com/) and are licensed under MIT:

> The MIT License (MIT)
>
> Copyright (c) 2019-2024 The Bootstrap Authors
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
