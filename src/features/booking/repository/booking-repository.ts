import type { Booking, CreateBookingInput, Quote, QuoteRequest } from '@/features/booking/types';

/**
 * Booking contract.
 *
 * Booking reads are RLS-scoped. Mutations ask server RPCs to change booking state.
 */
export interface BookingRepository {
  getQuote(request: QuoteRequest): Promise<Quote>;
  listBookings(): Promise<Booking[]>;
  getBooking(bookingId: string): Promise<Booking | null>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  confirmDemoPayment(bookingId: string): Promise<Booking>;
}
