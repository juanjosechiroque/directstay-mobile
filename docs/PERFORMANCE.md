# Performance

Measurements are recorded only when they were actually taken. **No on-device or simulator
measurement (startup time, frame rate, memory) has been done**; the numbers below come from the
bundler and from a JS-only render harness in Jest. Their limits are stated next to each one.

## How to reproduce

```bash
# Bundle size (Hermes bytecode per platform)
npx expo export --platform ios --platform android --output-dir /tmp/directstay-export

# List mount cost (Jest/Node, not a device)
npx jest --testMatch '**/*.perf.tsx' --runInBand
```

For device numbers, use a release/preview build, open the React DevTools Profiler (or the
Xcode Instruments "Time Profiler" / Android Studio Profiler) on Home, Search results and My
bookings, and record cold-start time and commit durations for the same three screens.

## Baseline ("before" list virtualization)

- Date: 2026-09-23
- Machine: macOS 27.0, Node 24.20.0, Expo SDK 57.0.23, React Native 0.86.3, app version 1.0.0
- Commit: after removing unused reanimated/worklets/gesture-handler, before any list change

### Bundle size (`expo export`, Hermes `.hbc`)

| Platform | Modules | Size   |
| -------- | ------- | ------ |
| iOS      | 1332    | 3.6 MB |
| Android  | 1467    | 3.9 MB |

### My bookings: items mounted on first render (`ScrollView` + `.map`)

Harness: `src/test/perf/lists.perf.tsx`, fake repository returning N bookings. "Mounted items"
is the count of `BookingCard`s in the rendered tree after the first data commit. It is
deterministic. `actualDuration` is the React `<Profiler>` sum for the screen's commits under
Jest on the development machine: it is noisy and **not representative of a phone**, so only
compare it with runs on the same machine (the first run of a process is slower due to JIT warm-up).

| Bookings | Mounted items | Commits | Profiler actualDuration (ms, 3 runs; first-run outlier excluded for N=10) |
| -------- | ------------- | ------- | ------------------------------------------------------------------------- |
| 10       | 10            | 3       | 201, 208 (250 on the cold first run)                                      |
| 100      | 100           | 3       | 112, 114, 115                                                             |
| 500      | 500           | 3       | 441, 442, 445                                                             |

Home (2 catalog properties) and Search results (units of one property) were not measured
separately: their sizes are bounded and small, so `.map` mounts a handful of items.

## After list changes

Same machine, method and harness as the baseline. Changes: My bookings is now a `FlatList`
(stable `keyExtractor`, item separator, pull-to-refresh, empty/error/skeleton states in
`ListEmptyComponent`); a shared `Skeleton` replaces the spinner on Home, search results and
My bookings. Home and search results stay on `.map` (see conclusion).

| Bookings | Mounted items (before → after) | Profiler actualDuration ms (after, 3 runs) |
| -------- | ------------------------------ | ------------------------------------------ |
| 10       | 10 → 10                        | 242, 286 (863 on the cold first run)       |
| 100      | 100 → 10                       | 23, 26, 26 (before: 112–115)               |
| 500      | 500 → 10                       | 24, 24, 29 (before: 441–445)               |

Bundle size: iOS 3.6 MB, Android 3.9 MB (unchanged at the reported precision).

### Conclusion

- The only list that can grow without bound is My bookings, and virtualizing it is a measured
  win in the JS harness: first render mounts 10 items regardless of N, and the JS render cost
  no longer scales with the number of bookings. For 10 bookings there is no gain (all items fit
  in the initial window); the extra `FlatList` machinery only pays off with many bookings.
- Home (organization catalog, currently 2 properties), property units (2-6) and search results
  (available units of one property) are small and bounded. They stay on `.map`: a `FlatList`
  would add complexity for no measurable gain, and the search results sit under a form inside a
  `ScrollView`, where nesting a same-direction `FlatList` is discouraged by React Native.
- These are Node/Jest numbers, not device numbers. Real-device startup time, frame drops and
  memory were **not** measured, so no claim is made about them. The skeletons are a perceived-
  loading improvement, not a measured speedup. The visual check of the skeletons and of the
  layout at large font sizes on the iOS simulator was not run here and is left to a manual pass.
- No `React.memo`/`useMemo`/`useCallback` were added: the React Compiler is active (verified by
  transforming a component with `babel-preset-expo` and finding the compiler runtime import).
