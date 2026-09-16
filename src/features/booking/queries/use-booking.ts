import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateAfterBookingCanceled } from '@/features/booking/queries/invalidation';
import { bookingKeys } from '@/features/booking/queries/keys';
import type { Booking, QuoteRequest } from '@/features/booking/types';
import { useRepositories } from '@/lib/repositories';

export { bookingKeys } from '@/features/booking/queries/keys';

export function useQuote(request: QuoteRequest | null) {
  const { booking } = useRepositories();
  return useQuery({
    queryKey: bookingKeys.quote(
      request ?? { unitId: '', checkIn: '', checkOut: '', guestCount: 0 },
    ),
    queryFn: () => booking.getQuote(request as QuoteRequest),
    enabled: request !== null,
    // A quote is a price snapshot; always revalidate it on mount so the flow never
    // starts from a stale amount after the unit rate or availability changed.
    staleTime: 0,
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
 * Cancellation is a server-authoritative, refund-triggering operation that is not enabled
 * until the payments phase. This hook exists so the intent is represented in the data
 * layer, but the server rejects it and the UI must direct the guest to contact the
 * property instead of implying an in-app cancellation.
 */
export function useCancelBooking() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation<Booking, unknown, string>({
    mutationFn: (bookingId) => booking.cancelBooking(bookingId),
    onSuccess: (updated) => {
      invalidateAfterBookingCanceled(queryClient, updated.id);
    },
  });
}
