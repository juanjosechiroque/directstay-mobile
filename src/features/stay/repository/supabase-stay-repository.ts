import type { BookingRepository } from '@/features/booking/repository/booking-repository';
import type { StayRepository } from '@/features/stay/repository/stay-repository';
import type { StayInfo } from '@/features/stay/types';
import type { Locale } from '@/lib/locale';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { mapStayInformation } from '@/lib/supabase/mappers';
import type { StayInformationJson } from '@/lib/supabase/types';

/**
 * Supabase-backed My Stay projection.
 *
 * First the owner-scoped booking read proves the caller owns a CONFIRMED booking, then
 * `get_stay_information` returns only the private stay fields for that booking. The RPC
 * repeats both checks server-side, so the client is never the only protection.
 */
export class SupabaseStayRepository implements StayRepository {
  constructor(
    private readonly client: DatabaseClient,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async getStay(bookingId: string, _locale: Locale): Promise<StayInfo | null> {
    const booking = await this.bookingRepository.getBooking(bookingId);
    if (!booking || booking.status !== 'CONFIRMED') {
      return null;
    }

    const { data, error } = await this.client.rpc('get_stay_information', {
      p_booking_id: bookingId,
    });
    if (error) {
      throw toAppError(error);
    }
    if (!data) {
      return null;
    }

    return {
      booking,
      propertyName: booking.propertyName,
      checkInTime: booking.propertyCheckInTime,
      checkOutTime: booking.propertyCheckOutTime,
      contactWhatsapp: booking.propertyWhatsapp,
      contactPhone: booking.propertyPhone,
      information: mapStayInformation(data as StayInformationJson),
    };
  }
}
