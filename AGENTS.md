# DirectStay Mobile — AGENTS.md

This file contains the operating instructions for AI agents used to develop DirectStay Mobile.
It keeps their changes aligned with the product, domain, architecture, and quality standards.

## Before writing any code

- Node.js **24** is required (pinned via `.nvmrc`; DirectStay standardizes on Node 24).
- Read the exact versioned docs: https://docs.expo.dev/versions/v57.0.0/ (Expo has changed across SDKs).
- Read the project docs when they exist:
  - `docs/PRODUCT.md`
  - `docs/DOMAIN.md`
  - `docs/ARCHITECTURE.md`
  - `.project/WORKING_DECISIONS.md` for local personal workflow decisions

## Project rules

- Do not turn DirectStay into Airbnb, Booking.com, a PMS or a hotel ERP.
- Use Ayni Hospitality only as demo/reference data. Do not hardcode the demo business into reusable domain logic.
- Do not introduce dependencies without explaining why.
- Do not change domain state rules without updating `docs/DOMAIN.md`.
- Do not use floating point for persisted money.
- Final payable price must be server-authoritative.
- The mobile client must never authoritatively confirm successful payment.
- The mobile client must never be the only protection against overlapping reservations.
- Critical multi-record operations must be transactionally safe.
- Stripe secret keys must never exist in the mobile application.
- Supabase service-role keys must never exist in the mobile application.
- All user-facing strings must use the i18n layer.
- Spanish is the default locale. English is supported.
- Use TanStack Query for server state.
- Avoid premature global state libraries and premature abstractions.
- Every asynchronous experience must handle loading, error and retry behavior where appropriate.
- Relevant tests accompany each cohesive change.
- Do not disable TypeScript, lint or tests merely to make checks pass.
- `.project/` is local, git-ignored development documentation. Never commit it.
- Explain important React Native, Supabase, PostgreSQL and Stripe concepts.
- At the end of a cohesive change, provide a completion report.

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest (watch)
npm run test:ci     # jest --ci --watchAll=false
npm run format      # expo lint --fix && prettier --write .
npm run format:check
```
