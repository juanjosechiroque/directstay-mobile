# DirectStay Mobile — AGENTS.md

## Before writing any code

- Read the exact versioned docs: https://docs.expo.dev/versions/v57.0.0/ (Expo has changed across SDKs).
- Read the project docs when they exist:
  - `docs/PRODUCT.md`
  - `docs/DOMAIN.md`
  - `docs/ARCHITECTURE.md`
  - `.project/ROADMAP.md`
  - `.project/WORKING_DECISIONS.md`

## Project rules

- Do not implement future roadmap phases unless explicitly requested.
- Do not turn DirectStay into Airbnb, Booking.com, a PMS or a hotel ERP.
- Use Ayni Mountain Cabins only as demo/reference data. Do not hardcode the demo business into reusable domain logic.
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
- Spanish is the default locale. Architecture must allow English later.
- Use TanStack Query for server state (backend phases).
- Avoid premature global state libraries and premature abstractions.
- Every asynchronous experience must handle loading, error and retry behavior where appropriate.
- Relevant tests accompany every phase.
- Do not disable TypeScript, lint or tests merely to make checks pass.
- `.project/` is local, git-ignored development documentation. Never commit it.
- Explain important React Native, Supabase, PostgreSQL and Stripe concepts.
- At the end of every phase, provide a Phase Completion Report.

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest (watch)
npm run test:ci     # jest --ci --watchAll=false
npm run format      # prettier --write .
npm run format:check
```

## Git workflow

- Work on a dedicated branch per phase (e.g. `codex/phase-00-foundation`).
- Use exactly one commit per phase by default. Split a phase into multiple commits only when
  Codex proposes it and the user explicitly approves the exception.
- The user creates the commit. Codex only edits the requested files and, when handing off a
  phase, provides exactly two suggested commit messages.
- Do not merge to main automatically.
