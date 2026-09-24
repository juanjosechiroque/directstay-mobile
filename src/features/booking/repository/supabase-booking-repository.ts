import type { BookingRepository } from '@/features/booking/repository/booking-repository';
import type { Booking, CreateBookingInput, Quote, QuoteRequest } from '@/features/booking/types';
import { AppError } from '@/lib/errors';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { mapBooking, mapBookingRpcResponse } from '@/lib/supabase/mappers';
import type { BookingRow, SearchUnitJson } from '@/lib/supabase/types';

/**
 * Supabase-backed booking reads and narrow server-authoritative mutations.
 *
 * RLS restricts every row to its owner (`guest_profile_id = auth.uid()`), so the queries
 * do not need a client-supplied user filter. RPCs enforce creation and confirmation.
 */
// Shared column list so the list and detail selects cannot silently drift apart: adding a
// base column here updates both, and `special_requests` is added explicitly to detail only.
const BOOKING_COLUMNS = [
  'id',
  'guest_profile_id',
  'unit_id',
  'status',
  'check_in',
  'check_out',
  'guest_count',
  'guest_name',
  'guest_email',
  'guest_phone',
  'currency',
  'nightly_rate_minor',
  'total_amount_minor',
  'hold_expires_at',
  'created_at',
  'confirmed_at',
  'canceled_at',
  'cancellation_reason',
  'refunded_at',
] as const;

const BOOKING_RELATIONS = `
  units (
    name,
    property_id,
    properties ( name, timezone, check_in_time, check_out_time, contact_whatsapp, contact_phone )
  )
`;

/** List reads omit `special_requests`, which booking cards never display. */
const BOOKING_SELECT = [...BOOKING_COLUMNS, BOOKING_RELATIONS].join(', ');

/** Detail reads add `special_requests`, which the detail screen shows. */
const BOOKING_DETAIL_SELECT = [...BOOKING_COLUMNS, 'special_requests', BOOKING_RELATIONS].join(
  ', ',
);

function isMissingSpecialRequestsColumn(error: unknown): boolean {
  const source = error as { code?: string; message?: string } | null;
  return source?.code === '42703' && source.message?.includes('special_requests') === true;
}

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
      .select(BOOKING_DETAIL_SELECT)
      .eq('id', bookingId)
      .maybeSingle();
    // COMPAT: temporary rollout shim. While a remote deployment still has an older schema
    // without `special_requests`, PostgreSQL reports 42703 and we re-read without that column
    // so detail pages keep working. Remove once the column is guaranteed to be deployed.
    if (isMissingSpecialRequestsColumn(error)) {
      const fallback = await this.client
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('id', bookingId)
        .maybeSingle();
      if (fallback.error) throw toAppError(fallback.error);
      return fallback.data ? mapBooking(fallback.data as unknown as BookingRow) : null;
    }
    if (error) {
      throw toAppError(error);
    }
    return data ? mapBooking(data as unknown as BookingRow) : null;
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const { data, error } = await this.client.rpc('create_booking', {
      p_unit_id: input.unitId,
      p_check_in: input.checkIn,
      p_check_out: input.checkOut,
      p_guest_count: input.guestCount,
      p_guest_name: input.guestName,
      p_guest_email: input.guestEmail,
      p_guest_phone: input.guestPhone,
      p_special_requests: input.specialRequests,
    });
    if (error) throw toAppError(error);
    const created = mapBookingRpcResponse(data);
    if (created.status !== 'PENDING_PAYMENT') throw new AppError('error.generic');
    const booking = await this.getBooking(created.id);
    if (!booking) throw new AppError('error.generic');
    return booking;
  }

  async confirmDemoPayment(bookingId: string): Promise<Booking> {
    const { data, error } = await this.client.rpc('confirm_demo_payment', {
      p_booking_id: bookingId,
    });
    if (error) throw toAppError(error);
    const confirmed = mapBookingRpcResponse(data);
    if (confirmed.status === 'CANCELED' && confirmed.cancellationReason === 'HOLD_EXPIRED') {
      throw new AppError('error.holdExpired');
    }
    if (confirmed.status !== 'CONFIRMED' || confirmed.id !== bookingId) {
      throw new AppError('error.generic');
    }
    const booking = await this.getBooking(confirmed.id);
    if (!booking) throw new AppError('error.generic');
    return booking;
  }
}
