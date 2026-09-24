import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { bookingKeys } from '@/features/booking/queries/keys';
import type { Quote, QuoteRequest } from '@/features/booking/types';
import { getErrorCode, type AppErrorCode } from '@/lib/errors';
import { useRepositories } from '@/lib/repositories';

export interface UseBookingQuoteResult {
  data: Quote | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  errorCode: AppErrorCode;
  isReady: boolean;
  retry: () => void;
}

interface QuoteReadinessInput {
  data: Quote | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function isBookingQuoteReady({ data, isLoading, isError }: QuoteReadinessInput): boolean {
  return !isLoading && !isError && Boolean(data);
}

/** Fetches the server quote and exposes the states used throughout the booking flow. */
export function useBookingQuote(request: QuoteRequest | null): UseBookingQuoteResult {
  const { booking } = useRepositories();
  // `skipToken` disables the query (no fetch) until a request exists, without a sentinel key
  // or a non-null cast. The quote is a price snapshot; always revalidate it on mount so the
  // flow never starts from a stale amount after the unit rate or availability changed.
  const query = useQuery({
    queryKey: bookingKeys.quote(request),
    queryFn: request ? () => booking.getQuote(request) : skipToken,
    staleTime: 0,
  });
  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    errorCode: getErrorCode(query.error),
    isReady: isBookingQuoteReady(query),
    retry,
  };
}

export function useBookings(enabled = true) {
  const { booking } = useRepositories();
  return useQuery({
    queryKey: bookingKeys.lists(),
    queryFn: () => booking.listBookings(),
    enabled,
  });
}

export function useBooking(bookingId: string | undefined) {
  const { booking } = useRepositories();
  return useQuery({
    queryKey: bookingKeys.detail(bookingId),
    queryFn: bookingId ? () => booking.getBooking(bookingId) : skipToken,
  });
}
