# Accessibility

This document records the accessibility pass over DirectStay Mobile: what was audited, what
was changed, what is still open, and how it was verified. It reflects the working tree after
the accessibility and list/loading changes, not a later state.

Scope: the mobile client's shared components and the main guest screens (Home, search results,
property/unit detail, booking flow, My bookings, My stay). The database, RPCs and RLS are out
of scope.

## How it was verified

- Static: `npm run typecheck`, `npm run lint`, `npm run format:check`.
- Behavioural: React Native Testing Library (RNTL) tests in `src/**/__tests__` render through
  `src/test/render.tsx` and query by accessible role, name and state (`Button`, `Calendar`,
  `GuestCounter`, `LanguageSwitch`, `TextField`, `DateField`, the booking screens and
  `StayScreen`).
- Contrast: WCAG 2.1 relative-luminance formula, computed for the actual `src/lib/theme.ts`
  pairs below.
- Bundle: `npx expo export --platform ios` compiles.
- **Not** verified on a device or simulator with VoiceOver/TalkBack, and **not** verified with
  Dynamic Type at large sizes. There is no device/simulator measurement in this document.
- The optional interactive layout check on the iOS simulator (Home, search results, My bookings,
  skeleton and large-font layout) was intentionally **not** run here; it is left to a manual pass.
  A dev-client build (`com.juanjosechiroque.directstay.dev`) is already installed on the local
  iPhone 17 simulator for that.

## Contrast (WCAG 2.1)

Ratios are `(lighter + 0.05) / (darker + 0.05)` from the relative luminance of each sRGB colour.
Normal text needs >= 4.5:1; large text and non-text UI boundaries need >= 3:1.

### Changed tokens

| Pair                           | Before    | Ratio before | Ratio after | Result               |
| ------------------------------ | --------- | ------------ | ----------- | -------------------- |
| `textMuted` on `background`    | `#6B6F68` | 4.63         | **5.89**    | AA                   |
| `textMuted` on `surface`       | `#6B6F68` | 5.12         | **6.52**    | AA                   |
| `textMuted` on `surfaceMuted`  | `#6B6F68` | 4.21         | **5.35**    | AA                   |
| `textSubtle` on `background`   | `#8C8F87` | 2.97         | **4.85**    | AA                   |
| `textSubtle` on `surface`      | `#8C8F87` | 3.28         | **5.36**    | AA                   |
| `textSubtle` on `surfaceMuted` | `#8C8F87` | 2.70         | **4.40**    | below 4.5 (see note) |
| `accent` on `background`       | `#B4713D` | 3.54         | **5.48**    | AA                   |
| `accent` on `surface`          | `#B4713D` | 3.91         | **6.06**    | AA                   |
| `accent` on `accentSoft`       | `#B4713D` | 3.06         | **4.74**    | AA                   |
| `neutral` on `background`      | `#6B6F68` | 4.63         | **5.89**    | AA                   |
| `neutral` on `surface`         | `#6B6F68` | 5.12         | **6.52**    | AA                   |

`textSubtle` on `surfaceMuted` is 4.40:1, just under the 4.5:1 normal-text threshold. The tokens
that use `textSubtle` (placeholders, weekday labels) render on `surface`, not `surfaceMuted`,
so this pairing is not currently used; it is listed for completeness.

### New boundary token (`borderStrong`)

`border` (`#E3DBCC`, 1.24–1.38:1) is fine for cosmetic separators but fails the 3:1 requirement
for the boundary of interactive controls (WCAG 1.4.11). A dedicated `borderStrong` (`#80847C`)
was added and applied to text inputs, the phone country selector, the date field, the guest
counter and the search property/radio options.

| Pair                             | Ratio |
| -------------------------------- | ----- |
| `borderStrong` on `surface`      | 3.81  |
| `borderStrong` on `background`   | 3.45  |
| `borderStrong` on `surfaceMuted` | 3.13  |

### Unchanged pairs (checked, already pass)

| Pair                                                    | Ratio |
| ------------------------------------------------------- | ----- |
| `text` on `background`                                  | 14.62 |
| `text` on `surface`                                     | 16.17 |
| `primary` on `surface`                                  | 7.49  |
| `white` on `primary` (primary button label)             | 7.49  |
| `primaryDark` on `primarySoft` (secondary button label) | 9.12  |
| `white` on `danger`                                     | 5.89  |
| `danger` on `surface`                                   | 5.89  |
| `danger` on `dangerSoft`                                | 4.60  |
| `success` on `successSoft`                              | 5.09  |
| `warning` on `warningSoft`                              | 4.52  |
| `info` on `infoSoft`                                    | 5.67  |

## Touch targets

- `control.minTouchSize` is now **44pt on iOS and 48dp on Android**, resolved from
  `Platform.OS` in `src/lib/theme.ts`. Previously it was a flat 44 everywhere.
- Controls raised to that minimum: language switch options (were 36pt tall), calendar day
  cells and the "today" button, the date-field picker and its close button, the phone country
  selector, text inputs, the unit-detail secondary link, contact actions and buttons.
- `hitSlop` extends small glyph targets without changing layout: calendar month arrows
  (`12`), guest-counter steppers (`8`) and the screen-header back button (`12`).

## Screen-reader announcements

A `useAnnounce(message)` hook wraps `AccessibilityInfo.announceForAccessibility` and speaks a
message when it becomes non-empty. It was added where a visual-only change would otherwise be
missed:

- Form and control errors: `TextField`, `DateField`, `GuestCounter`.
- Link failures: `ContactActions` (WhatsApp/phone) and the property map link.
- Payment hold milestones: the payment screen announces **60 s, 30 s, 10 s and expiry**, each
  at most once (`useRef(new Set())`), instead of reading the per-second countdown. The visible
  countdown is marked `accessibilityRole="timer"`.
- The guest counter value text is a polite live region.
- My Stay's Wi-Fi password is `selectable` and has a "Copy password" button that copies via
  `expo-clipboard` and announces "Password copied" (localized) through the same hook.

Other semantics added or cleaned up:

- Loading regions use `accessible` + `accessibilityRole="progressbar"` + `accessibilityState.busy`
  and a label; the shared `Skeleton` is decorative and every group is wrapped in a single
  `SkeletonGroup` busy region (children hidden from assistive tech), replacing the per-card
  spinner noise.
- Calendar days are labelled with the full localized date (plus "Hoy/Today"), the weekday
  header is hidden from assistive tech, and day text is capped at `maxFontSizeMultiplier={1.4}`.
- Screen titles keep `accessibilityRole="header"`; the screen-header title now wraps to two
  lines.
- Removed a redundant `accessibilityLabel` on `Badge` and redundant `accessibilityLiveRegion`
  props that the announcement hook supersedes.

## Reduced motion

`useReduceMotion()` reads `AccessibilityInfo.isReduceMotionEnabled()` and subscribes to
`reduceMotionChanged`. The `Skeleton` pulse is static (opacity 1) when the OS asks to reduce
motion. This is the only intentional animation; `expo-image` `transition={200}` is not yet
gated on it.

## No dark palette

`app.config.ts` sets `userInterfaceStyle: 'automatic'`, but the app has a single light palette
(`src/lib/theme.ts`) and does not read `useColorScheme`/`Appearance`; the status bar is always
`style="dark"`. This is a deliberate product decision for now, recorded here as debt: if the
system is in dark mode the app still renders the light theme. Adding a dark palette is a
product decision, not a bug fix.

## Text over the hero image (not verified)

The Home and property-detail hero titles render white / `#EDE4D3` text over the catalog image,
with only a light `rgba(20,24,20,0.18)` overlay. Contrast depends on the actual photo, so it
cannot be computed from the tokens and was **not** changed or verified; it needs a per-asset
check (or a stronger scrim) once real images are in place.

## Pending

- Keyboard behaviour in the guest form: `KeyboardAvoidingView` and the return-key focus order
  (name → email → phone → requests) cannot be observed in Jest, so they need a device/simulator
  check on a small screen. The component tests only cover the form's data flow.
- VoiceOver (iOS) and TalkBack (Android) walkthrough on a device/simulator. Only RNTL tests and
  code review back the current claims.
- Dynamic Type at the largest sizes; today only the calendar day text caps scaling, and no
  layout was checked at 200% text.
- Hero-image text contrast (above).
- Dark theme (above).
- E2E accessibility assertions (Maestro) are not implemented.
