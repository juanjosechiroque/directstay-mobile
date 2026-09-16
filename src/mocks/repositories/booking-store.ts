import type { Booking } from '@/features/booking/types';

import { MOCK_BOOKINGS } from '../data/bookings';
import { clone } from './clone';

/**
 * In-memory booking store for the mock repositories. Mutations (create, pay, cancel)
 * persist for the duration of the app session, which lets the demo walk the full flow
 * without a backend.
 */
let bookings: Booking[] = MOCK_BOOKINGS.map((booking) => clone(booking));
let sequence = 0;

export function listAllBookings(): Booking[] {
  return bookings;
}

export function findBooking(bookingId: string): Booking | undefined {
  return bookings.find((booking) => booking.id === bookingId);
}

export function insertBooking(booking: Booking): void {
  bookings = [booking, ...bookings];
}

export function updateBooking(booking: Booking): void {
  bookings = bookings.map((current) => (current.id === booking.id ? booking : current));
}

export function nextBookingId(): string {
  sequence += 1;
  return `mock-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

/**
 * Applies the frozen retention rule: a `PENDING_PAYMENT` booking whose hold passed is
 * auto-`CANCELED` with `HOLD_EXPIRED`, which releases inventory. Mirrors the server rule
 * (a cleanup job is only a backup; the transactional path cancels expired holds first).
 * Returns the ids that were expired so callers can report it.
 */
export function expireStaleHolds(now: Date): string[] {
  const nowMs = now.getTime();
  const expired = bookings
    .filter(
      (booking) =>
        booking.status === 'PENDING_PAYMENT' && new Date(booking.holdExpiresAt).getTime() <= nowMs,
    )
    .map<Booking>((booking) => ({
      ...booking,
      status: 'CANCELED',
      confirmedAt: null,
      canceledAt: booking.holdExpiresAt,
      cancellationReason: 'HOLD_EXPIRED',
      refundedAt: null,
    }));

  expired.forEach(updateBooking);
  return expired.map((booking) => booking.id);
}

export function resetMockBookingStore(): void {
  bookings = MOCK_BOOKINGS.map((booking) => clone(booking));
  sequence = 0;
}
