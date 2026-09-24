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
