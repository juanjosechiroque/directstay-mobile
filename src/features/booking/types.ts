import type { IsoDate } from '@/lib/dates';

/**
 * Booking domain types.
 *
 * Independent from React Native, Supabase and Stripe. Money is always integer minor
 * units plus a currency; booking dates follow `[checkIn, checkOut)`.
 */

export const BOOKING_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELED', 'REFUNDED'] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const CANCELLATION_REASONS = ['HOLD_EXPIRED', 'USER_CANCELLED', 'SYSTEM'] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export interface Booking {
  id: string;
  guestProfileId: string;
  unitId: string;
  unitName: string;
  status: BookingStatus;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  currency: string;
  nightlyRateMinor: number;
  totalAmountMinor: number;
  holdExpiresAt: string;
  createdAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;
  cancellationReason: CancellationReason | null;
  refundedAt: string | null;
}

export interface QuoteRequest {
  unitId: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  guestCount: number;
}

/** Price snapshot returned by the repository. The client never authors this value. */
export interface Quote {
  unitId: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  guestCount: number;
  nightlyRateMinor: number;
  totalAmountMinor: number;
  currency: string;
}

export interface CreateBookingInput extends QuoteRequest {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
}

/**
 * Result of the mocked payment step. It is explicitly not a real payment.
 *
 * `EXPIRED` means the 5-minute hold ended before confirmation, so the booking was
 * auto-canceled with `HOLD_EXPIRED` and never took payment — it must not be shown as
 * confirmed.
 */
export type PaymentSimulationOutcome = 'CONFIRMED' | 'EXPIRED';

export interface PaymentSimulationResult {
  booking: Booking;
  demo: true;
  outcome: PaymentSimulationOutcome;
}
