import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { invalidateAfterBookingCreated } from '@/features/booking/queries/invalidation';
import type { BookingRepository } from '@/features/booking/repository/booking-repository';
import { useRepositories } from '@/lib/repositories';
import { getErrorCode } from '@/lib/errors';

export function useCreateBooking() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof booking.createBooking>[0]) =>
      booking.createBooking(input),
    onSuccess: (created) => invalidateAfterBookingCreated(queryClient, created.id),
  });
}

export async function confirmDemoPaymentAndInvalidate(
  booking: BookingRepository,
  queryClient: QueryClient,
  bookingId: string,
) {
  try {
    const confirmed = await booking.confirmDemoPayment(bookingId);
    invalidateAfterBookingCreated(queryClient, confirmed.id);
    return confirmed;
  } catch (error) {
    if (getErrorCode(error) === 'error.holdExpired') {
      invalidateAfterBookingCreated(queryClient, bookingId);
    }
    throw error;
  }
}

export function useConfirmDemoPayment() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      confirmDemoPaymentAndInvalidate(booking, queryClient, bookingId),
  });
}
