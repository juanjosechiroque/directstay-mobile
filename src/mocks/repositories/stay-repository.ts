import type { StayRepository } from '@/features/stay/repository';
import type { StayInfo } from '@/features/stay/types';
import type { BookingRepository } from '@/features/booking/repository';
import type { PropertyRepository } from '@/features/property/repository';

/**
 * My Stay is a projection, not an entity: it composes the confirmed booking with the
 * property's stay information. It is only available for `CONFIRMED` bookings.
 */
export class MockStayRepository implements StayRepository {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async getStay(bookingId: string): Promise<StayInfo | null> {
    const booking = await this.bookingRepository.getBooking(bookingId);
    if (!booking || booking.status !== 'CONFIRMED') {
      return null;
    }
    const property = await this.propertyRepository.getProperty();
    return { booking, property };
  }
}
