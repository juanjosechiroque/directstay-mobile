/**
 * Minimal clock abstraction.
 *
 * Repositories take a `Clock` instead of calling `Date.now()` directly, which lets the
 * mock layer simulate hold expirations deterministically in tests without real waiting.
 * Production code uses `systemClock`.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
