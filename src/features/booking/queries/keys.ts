import type { QuoteRequest } from '@/features/booking/types';

/**
 * Booking query keys (pure module).
 *
 * Extracted so both the query hooks and the invalidation helper can depend on it without
 * importing each other, keeping the dependency graph acyclic.
 */
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  /** Accepts `undefined` so the query hook can key before an id exists (query stays skipped). */
  detail: (bookingId: string | undefined) => [...bookingKeys.all, 'detail', bookingId] as const,
  quote: (request: QuoteRequest | null) =>
    [
      ...bookingKeys.all,
      'quote',
      request?.unitId ?? null,
      request?.checkIn ?? null,
      request?.checkOut ?? null,
      request?.guestCount ?? null,
    ] as const,
};
