import type {
  Booking,
  CreateBookingInput,
  PaymentSimulationResult,
  Quote,
  QuoteRequest,
} from '@/features/booking/types';

/**
 * Booking contract.
 *
 * In production the mutating operations become server RPCs / Edge Functions (create
 * booking, create PaymentIntent, refund) while reads stay RLS-scoped. Screens and query
 * hooks only see this interface, so a `SupabaseBookingRepository` can replace the mock
 * without rewriting the UI.
 */
export interface BookingRepository {
  getQuote(request: QuoteRequest): Promise<Quote>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  simulatePayment(bookingId: string): Promise<PaymentSimulationResult>;
  listBookings(): Promise<Booking[]>;
  getBooking(bookingId: string): Promise<Booking | null>;
  cancelBooking(bookingId: string): Promise<Booking>;
}
