# DirectStay

DirectStay is a mobile direct-booking and guest-stay application for independent
accommodation businesses (cabins, lodges, boutique hotels, and short-stay apartments).

Guests explore a property, check real availability, select a unit, create a temporary
booking hold, pay securely, and access essential stay information from their phone.

> DirectStay is a mobile direct-booking and guest-stay experience for independent
> accommodations, allowing guests to check real availability, securely reserve and pay
> for a unit, and access essential stay information directly from their phone.

## Demo business

The reference/demo property is the **fictional** business **Ayni Mountain Cabins**
(Ayni Hospitality), Sacred Valley, Cusco, Peru. Units: Killa, Inti, Wayra and Sumaq
cabins. All demo information is fictional; it exists as seed/mock data only and must
never be reused as domain logic.

## Stack

- React Native + Expo (SDK 57) + Expo Router
- TypeScript (strict)
- i18n: i18next + react-i18next (Spanish default, i18n-ready)
- Server state: TanStack Query
- Testing: Jest + jest-expo
- Lint/format: ESLint (`expo lint`) + Prettier
- CI: GitHub Actions
- Supabase (Auth/RPC/RLS/Edge Functions) and Stripe PaymentSheet

## Getting started

**Prerequisites:** Node.js 24 (required). A `.nvmrc` pins the exact major version.

```bash
npm install
npm start
```

Useful scripts:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:ci
npx expo-doctor
```

## App identifiers / environments

`app.config.ts` resolves the visible name and bundle identifier from
`EAS_BUILD_PROFILE` (development | preview | production):

| Profile     | Name               | Bundle / package                          |
| ----------- | ------------------ | ----------------------------------------- |
| development | DirectStay Dev     | `com.juanjosechiroque.directstay.dev`     |
| preview     | DirectStay Preview | `com.juanjosechiroque.directstay.preview` |
| production  | DirectStay         | `com.juanjosechiroque.directstay`         |

Deep-link scheme: `directstay`. EAS build profiles live in `eas.json`.

## Project structure

```
app.config.ts        # build-profile-driven Expo config
src/
  app/               # Expo Router routes
  i18n/              # i18next setup + locale files
assets/              # icons, splashes
docs/                # public engineering/product docs
.project/            # local, git-ignored development docs
```

## Documentation

- `docs/PRODUCT.md` — product scope and boundaries
- `docs/DOMAIN.md` — domain model, invariants, state machines
- `docs/ARCHITECTURE.md` — where responsibilities live

## License

None yet — private portfolio project. The template MIT license was removed.
