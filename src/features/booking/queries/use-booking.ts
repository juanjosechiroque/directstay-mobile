import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Booking,
  CreateBookingInput,
  PaymentSimulationResult,
  QuoteRequest,
} from '@/features/booking/types';
import { useRepositories } from '@/lib/repositories';

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  detail: (bookingId: string) => [...bookingKeys.all, 'detail', bookingId] as const,
  quote: (request: QuoteRequest) =>
    [
      ...bookingKeys.all,
      'quote',
      request.unitId,
      request.checkIn,
      request.checkOut,
      request.guestCount,
    ] as const,
};

export function useQuote(request: QuoteRequest | null) {
  const { booking } = useRepositories();
  return useQuery({
    queryKey: bookingKeys.quote(
      request ?? { unitId: '', checkIn: '', checkOut: '', guestCount: 0 },
    ),
    queryFn: () => booking.getQuote(request as QuoteRequest),
    enabled: request !== null,
  });
}

export function useBookings() {
  const { booking } = useRepositories();
  return useQuery({
    queryKey: bookingKeys.lists(),
    queryFn: () => booking.listBookings(),
  });
}

export function useBooking(bookingId: string | undefined) {
  const { booking } = useRepositories();
  return useQuery({
    queryKey: bookingKeys.detail(bookingId ?? 'missing'),
    queryFn: () => booking.getBooking(bookingId as string),
    enabled: Boolean(bookingId),
  });
}

/**
 * Creates the booking as `PENDING_PAYMENT` and runs the mocked payment in one async
 * operation. In production these become two distinct server calls: `create_booking` RPC
 * and a Stripe PaymentSheet flow whose confirmation only arrives via webhook.
 */
export function useStartDemoBooking() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation<PaymentSimulationResult, unknown, CreateBookingInput>({
    mutationFn: async (input) => {
      const created = await booking.createBooking(input);
      return booking.simulatePayment(created.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(result.booking.id) });
    },
  });
}

export function useCancelBooking() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation<Booking, unknown, string>({
    mutationFn: (bookingId) => booking.cancelBooking(bookingId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(updated.id) });
    },
  });
}
