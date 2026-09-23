import type { BookingRepository } from '@/features/booking/repository/booking-repository';
import type { Booking, Quote, QuoteRequest } from '@/features/booking/types';
import { AppError } from '@/lib/errors';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { mapBooking } from '@/lib/supabase/mappers';
import type { BookingRow, SearchUnitJson } from '@/lib/supabase/types';

/**
 * Supabase-backed booking reads.
 *
 * RLS restricts every row to its owner (`guest_profile_id = auth.uid()`), so the queries
 * do not need a client-supplied user filter. Booking creation, confirmation and refunds
 * are server-side operations because they change shared reservation and payment state.
 */
const BOOKING_SELECT = `
  id, guest_profile_id, unit_id, status, check_in, check_out, guest_count,
  guest_name, guest_email, guest_phone, currency, nightly_rate_minor, total_amount_minor,
  hold_expires_at, created_at, confirmed_at, canceled_at, cancellation_reason, refunded_at,
  units (
    name,
    property_id,
    properties ( name, timezone, check_in_time, check_out_time, contact_whatsapp, contact_phone )
  )
`;

export class SupabaseBookingRepository implements BookingRepository {
  constructor(
    private readonly client: DatabaseClient,
    private readonly organizationSlug: string,
  ) {}

  async getQuote({ unitId, checkIn, checkOut, guestCount }: QuoteRequest): Promise<Quote> {
    const { data, error } = await this.client.rpc('search_available_units', {
      p_organization_slug: this.organizationSlug,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guestCount,
      p_locale: null,
      p_unit_id: unitId,
    });
    if (error) {
      throw toAppError(error);
    }
    const row = ((data ?? []) as SearchUnitJson[]).find((item) => item.unit.id === unitId);
    if (!row) {
      throw new AppError('error.unavailable');
    }
    return {
      unitId,
      checkIn,
      checkOut,
      nights: row.nights,
      guestCount,
      nightlyRateMinor: row.unit.nightlyRateMinor,
      totalAmountMinor: row.totalAmountMinor,
      currency: row.currency,
    };
  }

  async listBookings(): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select(BOOKING_SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      throw toAppError(error);
    }
    return ((data ?? []) as unknown as BookingRow[]).map(mapBooking);
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    const { data, error } = await this.client
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('id', bookingId)
      .maybeSingle();
    if (error) {
      throw toAppError(error);
    }
    return data ? mapBooking(data as unknown as BookingRow) : null;
  }
}
