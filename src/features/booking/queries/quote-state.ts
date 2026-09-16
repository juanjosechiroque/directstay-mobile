import type { Quote } from '@/features/booking/types';
import { getErrorCode, type AppErrorCode } from '@/lib/errors';

export interface QuoteQuerySnapshot {
  data: Quote | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

export interface BookingQuoteState {
  quote: Quote | undefined;
  isLoading: boolean;
  isError: boolean;
  errorCode: AppErrorCode;
  /** True only when a valid quote exists and the flow may proceed. */
  isReady: boolean;
}

/**
 * Pure mapping from a query snapshot to the booking-flow quote state. Kept separate from
 * React so the readiness rules are unit-testable without rendering.
 */
export function deriveQuoteState(snapshot: QuoteQuerySnapshot): BookingQuoteState {
  const { data, isLoading, isError, error } = snapshot;
  return {
    quote: data,
    isLoading,
    isError,
    errorCode: getErrorCode(error),
    isReady: !isLoading && !isError && Boolean(data),
  };
}
