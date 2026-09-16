import type { Quote } from '@/features/booking/types';
import { AppError } from '@/lib/errors';

import { deriveQuoteState } from '../quote-state';

const quote: Quote = {
  unitId: 'unit-1',
  checkIn: '2028-01-10',
  checkOut: '2028-01-13',
  nights: 3,
  guestCount: 2,
  nightlyRateMinor: 12000,
  totalAmountMinor: 36000,
  currency: 'USD',
};

describe('deriveQuoteState', () => {
  it('is ready only when a quote exists with no loading or error', () => {
    const state = deriveQuoteState({
      data: quote,
      isLoading: false,
      isError: false,
      error: undefined,
    });
    expect(state.isReady).toBe(true);
    expect(state.quote).toEqual(quote);
  });

  it('is not ready while loading', () => {
    const state = deriveQuoteState({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
    });
    expect(state.isReady).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('is not ready on error and exposes the translated error code', () => {
    const state = deriveQuoteState({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new AppError('error.unavailable'),
    });
    expect(state.isReady).toBe(false);
    expect(state.isError).toBe(true);
    expect(state.errorCode).toBe('error.unavailable');
  });

  it('is not ready when an error coexists with stale data', () => {
    const state = deriveQuoteState({
      data: quote,
      isLoading: false,
      isError: true,
      error: new AppError('error.generic'),
    });
    expect(state.isReady).toBe(false);
  });
});
