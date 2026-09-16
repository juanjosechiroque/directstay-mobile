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
  detail: (bookingId: string) => [...bookingKeys.all, 'detail', bookingId] as const,
  quote: (request: QuoteRequest) =>
    [
      ...bookingKeys.all,
      'quote',
      request.unitId,
      request.checkIn,
      request.checkOut,
      request.guestCount,
    ] as const,
};
