import type { IsoDate } from '@/lib/dates';

/**
 * Booking domain types.
 *
 * Independent from React Native, Supabase and Stripe. Money is always integer minor
 * units plus a currency; booking dates follow `[checkIn, checkOut)`.
 *
 * A booking carries the public property context (name, schedule, contact) so the UI can
 * render a booking without a second catalog read and without mixing in private data.
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
  propertyId: string;
  propertyName: string;
  propertyTimezone: string;
  propertyCheckInTime: string;
  propertyCheckOutTime: string;
  propertyWhatsapp: string | null;
  propertyPhone: string | null;
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
