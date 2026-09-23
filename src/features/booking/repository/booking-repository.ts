import type { Booking, Quote, QuoteRequest } from '@/features/booking/types';

/**
 * Booking contract.
 *
 * Booking reads are RLS-scoped and served through the Supabase adapter. Mutating booking
 * operations are server-authoritative and intentionally absent from this read-only
 * client contract.
 */
export interface BookingRepository {
  getQuote(request: QuoteRequest): Promise<Quote>;
  listBookings(): Promise<Booking[]>;
  getBooking(bookingId: string): Promise<Booking | null>;
}
