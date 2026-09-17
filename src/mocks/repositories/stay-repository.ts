import type { BookingRepository } from '@/features/booking/repository';
import type { PropertyRepository } from '@/features/property/repository';
import type { StayRepository } from '@/features/stay/repository';
import type { StayInfo } from '@/features/stay/types';
import type { Locale } from '@/lib/locale';

import { MOCK_STAY_INFORMATION } from '../data/property';
import { clone } from './clone';

/**
 * In-memory fixture adapter (tests only).
 *
 * My Stay is a projection: the confirmed booking plus the private stay information. Only
 * `CONFIRMED` bookings expose it, mirroring the server rule. `PropertyRepository` is kept
 * in the signature so existing fixtures compose the same way as production.
 */
export class MockStayRepository implements StayRepository {
  constructor(
    private readonly bookingRepository: BookingRepository,
    _propertyRepository: PropertyRepository,
  ) {}

  async getStay(bookingId: string, _locale: Locale): Promise<StayInfo | null> {
    const booking = await this.bookingRepository.getBooking(bookingId);
    if (!booking || booking.status !== 'CONFIRMED') {
      return null;
    }
    return {
      booking,
      propertyName: booking.propertyName,
      checkInTime: booking.propertyCheckInTime,
      checkOutTime: booking.propertyCheckOutTime,
      contactWhatsapp: booking.propertyWhatsapp,
      contactPhone: booking.propertyPhone,
      information: clone(MOCK_STAY_INFORMATION),
    };
  }
}
