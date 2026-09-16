import type { Booking } from '@/features/booking/types';
import type { IsoDate } from '@/lib/dates';
import { rangesOverlap } from '@/lib/dates';

import { MOCK_AVAILABILITY_BLOCKS } from '../data/availability-blocks';
import { findMockUnitSeed } from '../data/units';
import { listAllBookings } from './booking-store';

/**
 * Mock inventory rule: `CONFIRMED` bookings and non-expired `PENDING_PAYMENT` bookings
 * block a unit; `CANCELED`/`REFUNDED` never do. Availability blocks are considered too.
 * Shared by availability search and booking creation so both agree.
 */
export function blocksInventory(booking: Booking, now: number): boolean {
  if (booking.status === 'CONFIRMED') {
    return true;
  }
  if (booking.status === 'PENDING_PAYMENT') {
    return new Date(booking.holdExpiresAt).getTime() > now;
  }
  return false;
}

export function isUnitAvailable(
  unitId: string,
  checkIn: IsoDate,
  checkOut: IsoDate,
  guests: number,
  now: number = Date.now(),
): boolean {
  const unit = findMockUnitSeed(unitId);
  if (!unit || unit.maxGuests < guests) {
    return false;
  }

  const conflictWithBooking = listAllBookings().some(
    (booking) =>
      booking.unitId === unitId &&
      blocksInventory(booking, now) &&
      rangesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut),
  );
  if (conflictWithBooking) {
    return false;
  }

  const conflictWithBlock = MOCK_AVAILABILITY_BLOCKS.some(
    (block) =>
      block.unitId === unitId && rangesOverlap(checkIn, checkOut, block.checkIn, block.checkOut),
  );
  return !conflictWithBlock;
}
