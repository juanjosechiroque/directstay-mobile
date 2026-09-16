import { useCallback } from 'react';

import { useQuote } from '@/features/booking/queries/use-booking';
import { deriveQuoteState, type BookingQuoteState } from '@/features/booking/queries/quote-state';
import type { QuoteRequest } from '@/features/booking/types';

export type { BookingQuoteState, QuoteQuerySnapshot } from '@/features/booking/queries/quote-state';

export interface UseBookingQuoteResult extends BookingQuoteState {
  retry: () => void;
}

/**
 * Quote state for the booking flow. Unlike a plain `useQuery`, it never exposes a
 * "not ready" state without an explanation: callers can render loading, an error with
 * retry, or the amount, and gate the primary CTA on `isReady`.
 */
export function useBookingQuote(request: QuoteRequest | null): UseBookingQuoteResult {
  const query = useQuote(request);
  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    ...deriveQuoteState({
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    }),
    retry,
  };
}
