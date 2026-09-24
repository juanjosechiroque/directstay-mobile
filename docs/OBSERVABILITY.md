# Observability

This document describes how DirectStay Mobile reports crashes, operational failures and
backend diagnostics. It covers the Sentry integration, the typed operational error
reporter, data-privacy rules, and how to investigate Auth, PostgREST and Postgres issues
using Supabase Logs.

## Sentry crash reporting

The app uses `@sentry/react-native` configured for Expo SDK 57. Sentry is initialized once
in `src/app/_layout.tsx` and wraps the root component so uncaught JS errors and native
crashes are captured.

### Configuration

- **DSN**: public, read from `EXPO_PUBLIC_SENTRY_DSN` and safe to bundle.
- **Auth token**: `SENTRY_AUTH_TOKEN` is read by the native build plugins only. It must
  never use an `EXPO_PUBLIC_` prefix and never be committed.
- **Build plugin**: `app.config.ts` uses `withSentry` from `@sentry/react-native/expo` so
  source maps and debug symbols are uploaded automatically during native builds.
- **Metro plugin**: `metro.config.js` uses `getSentryExpoConfig` to inject Debug IDs into
  bundles and source maps.

### Environments

Sentry separates events by build profile:

| Build profile | Sentry `environment` | Purpose                                         |
| ------------- | -------------------- | ----------------------------------------------- |
| `development` | `development`        | Local Metro runs and development-client builds. |
| `preview`     | `preview`            | Internal distribution builds.                   |
| `production`  | `production`         | Store builds.                                   |

Development events are tagged `development` so they do not pollute production crash
statistics, but they still report so development-client crashes can be verified.

### Disabled features

The following Sentry features are intentionally turned off in this change:

- Performance tracing (`tracesSampleRate: 0`).
- Profiling (`profilesSampleRate: 0`).
- Logs (`enableLogs: false`).
- Session replay (no `mobileReplayIntegration`).
- Screenshots and view hierarchy.

Funnel analytics and session replay are out of scope.

## Operational error reporter

`src/lib/telemetry` exposes a single typed entry point for reporting operational failures:

```ts
reportOperationalError(error, { operation: 'booking.createBooking' });
```

The reporter adds tags for:

- `operation` — human-readable operation name.
- `appErrorCode` — the translated `AppErrorCode`.
- `platform` — iOS, Android or web.
- `version` — app version from `expo-constants`.
- `environment` — development / preview / production.

### What is reported

Unexpected operational failures only:

- `error.generic`
- `error.authFailed`
- `error.authRateLimited`
- `error.sessionRequired`
- `error.configuration`

Unknown `AppError` codes are reported as `error.generic` because they usually indicate a
missing mapper.

### What is NOT reported

Expected domain outcomes are never reported as crashes:

- `error.unavailable` (`unit_unavailable`, overlapping reservation, `23P01`).
- `error.holdExpired` (five-minute hold expired).
- `error.validation` (invalid dates, malformed input).
- `error.notFound` (RLS/RPC `not_found`).

### Deduplication

The reporter prevents duplicate reports:

1. The same error instance is never reported twice (`WeakSet`).
2. The same `(operation, appErrorCode)` pair is reported at most once every five minutes.

This lets the repository report close to the failure origin without the screen or hook
reporting it again.

## Data privacy

Guest data must never leave the device in telemetry. The following rules are enforced:

1. `sendDefaultPii: false` disables user, cookie, header and IP collection by default.
2. `sanitizeEvent` (the `beforeSend` hook) is applied to every event:
   - `user` is replaced with `{ ip_address: '0.0.0.0' }`.
   - `request.url` is stripped of query strings and identifiers (UUIDs and long numbers).
   - `request.query_string`, `cookies` and `headers` are removed.
   - `exception.cause` is removed so Supabase/PostgREST internal objects are not forwarded.
   - `extra` is filtered to an allow-list: `operation`, `appErrorCode`, `platform`,
     `version`, `environment`.
   - `contexts` is filtered to `device`, `os`, `app`, `culture`, `react`, `expo`.
   - Console breadcrumbs are dropped.
   - Breadcrumb messages are sanitized to remove UUIDs and long numbers.
3. `beforeBreadcrumb` drops console breadcrumbs and sanitizes HTTP breadcrumb URLs.
4. The `HttpContext` integration is removed so the User-Agent is not attached.
5. Console logs are disabled in the breadcrumbs integration.

Never attach guest name, email, phone, special requests, Wi-Fi passwords, full URL
parameters, booking identifiers or Supabase error causes to Sentry events.

## Development-only test error

A tiny `TelemetryTestButton` is rendered only when `__DEV__` is true, so it is removed from
release bundles. Tapping it calls `captureTestError()`, which sends a test event to Sentry.
This is only for verifying wiring in a development build; it cannot be triggered in
production.

## Backend diagnostics with Supabase Logs

When Sentry shows an operational failure, investigate the backend using Supabase Logs
without changing any remote configuration.

### Where to look

Supabase Dashboard → **Logs** → select the relevant explorer:

| Area      | Log source        | What it captures                                                     |
| --------- | ----------------- | -------------------------------------------------------------------- |
| Auth      | `auth` / `gotrue` | Anonymous sign-in, session refresh, rate limits, JWT validation.     |
| PostgREST | `postgrest`       | SQL generated from RPC and table requests, HTTP status, RLS context. |
| Postgres  | `postgres`        | Constraint violations (`23P01`), RPC exceptions, slow queries.       |

### Auth signals

- `auth` logs show `msg=...` for sign-in attempts and token refresh.
- Repeated `429` or `over_request_rate_limit` indicate the anonymous IP rate limit is
  being hit (see `supabase/config.toml` for the local limit and the Supabase Dashboard for
  the remote one).
- `Invalid login credentials` or JWT failures point to a corrupted persisted session.

### PostgREST signals

- `postgrest` logs include the request method, path and HTTP status.
- A `404` for an RPC usually means the function does not exist or the user role is wrong.
- A `401` means the request reached PostgREST but the JWT was missing or expired.
- Check the `role` claim: authenticated requests should show `role=authenticated`.

### Postgres signals

- `ERROR: 23P01 exclusion_constraint_violation` → overlapping reservation attempt. Search
  for the same `unit_id` and date range around the timestamp.
- `ERROR: 42703 column "special_requests" does not exist` → remote schema is older than
  the client expectation (the app has a rollout shim for this).
- `ERROR: P0002 query returned no rows` → an RPC `SELECT` did not find the expected row,
  often an unauthorized booking or a missing property/unit.
- Slow query warnings (`duration: ...`) around `search_available_units` or
  `create_booking` indicate contention or missing indexes.

### Mapping Sentry tags to logs

Use the Sentry `operation` tag to choose the backend log query:

- `auth.restoreSession` → filter Auth logs by the request timestamp and `anon` or
  `authenticated` role.
- `booking.createBooking` → filter Postgres/PostgREST logs for `create_booking` RPC calls.
- `booking.confirmDemoPayment` → filter Postgres/PostgREST logs for `confirm_demo_payment`.

Because Sentry events do not contain booking IDs or guest identifiers, correlate by
**timestamp** and **operation name**.

### Limitations

- Supabase Logs retention depends on your Supabase plan; older events may no longer be
  queryable.
- Anonymous guest sessions do not have stable emails, so Auth logs are correlated by
  `auth.uid()` or request time, not by identity.
- Postgres logs do not show the original RPC parameter values unless explicit logging is
  configured; use operation names and timestamps as the primary correlation keys.
- PostgREST request logs do not include the full response body, only status and error
  summaries.
- Local `supabase start` logs may differ slightly from hosted logs; verify production
  issues against the hosted project.

## Verifying events in Sentry

After triggering the development test button or a real crash:

1. Open the Sentry project (`juanjosechiroque / direct-stay`).
2. Check **Issues** for the environment tag (`development`, `preview` or `production`).
3. Confirm the issue has tags `operation`, `appErrorCode`, `platform`, `version` and
   `environment`.
4. Expand the event and verify that **no PII** appears in:
   - User context
   - Request query string / URL
   - Breadcrumbs
   - Extra context
5. For release builds, open an event's stack trace and confirm frames show source file
   names and line numbers instead of minified names. Source maps are uploaded by the
   Sentry Expo plugin during the build; if frames remain minified, check that
   `SENTRY_AUTH_TOKEN` was available and that the `release`/`dist` values in the event
   match the uploaded source-map artifact.

Do not assume events arrived or that traces are symbolicated without checking the Sentry
UI.
