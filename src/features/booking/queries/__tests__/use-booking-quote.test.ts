import type { Quote } from '@/features/booking/types';

import { isBookingQuoteReady } from '../use-booking';

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

describe('booking quote readiness', () => {
  it('is ready when a quote exists with no loading or error', () => {
    expect(isBookingQuoteReady({ data: quote, isLoading: false, isError: false })).toBe(true);
  });

  it('is not ready while loading', () => {
    expect(isBookingQuoteReady({ data: undefined, isLoading: true, isError: false })).toBe(false);
  });

  it('is not ready on error', () => {
    expect(isBookingQuoteReady({ data: undefined, isLoading: false, isError: true })).toBe(false);
  });

  it('is not ready when an error coexists with stale data', () => {
    expect(isBookingQuoteReady({ data: quote, isLoading: false, isError: true })).toBe(false);
  });
});
