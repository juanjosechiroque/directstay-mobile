import type { Booking, Quote, QuoteRequest } from '@/features/booking/types';

/**
 * Booking contract.
 *
 * Reads stay RLS-scoped and are served through the Supabase adapter. Mutating booking
 * operations (create, confirm, refund) are intentionally absent: they become server RPCs
 * / Edge Functions in the payments phase, and the mobile client must not invoke them yet.
 * `cancelBooking` remains a client intent that the server would validate authoritatively.
 */
export interface BookingRepository {
  getQuote(request: QuoteRequest): Promise<Quote>;
  listBookings(): Promise<Booking[]>;
  getBooking(bookingId: string): Promise<Booking | null>;
  cancelBooking(bookingId: string): Promise<Booking>;
}
