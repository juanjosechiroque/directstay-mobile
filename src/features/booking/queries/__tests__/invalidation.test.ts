import { QueryClient } from '@tanstack/react-query';

import type { BookingRepository } from '@/features/booking/repository/booking-repository';
import { bookingKeys } from '@/features/booking/queries/keys';
import { invalidateAfterBookingCreated } from '@/features/booking/queries/invalidation';
import { availabilityKeys } from '@/features/search/queries/use-availability-search';
import { stayKeys } from '@/features/stay/queries/use-stay';

function createClient(): QueryClient {
  // `gcTime: Infinity` prevents background GC timers from keeping Jest alive.
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

describe('booking cache invalidation', () => {
  it('invalidates booking, availability and stay roots after creating a booking', async () => {
    const queryClient = createClient();
    const bookingRepository: BookingRepository = {
      getQuote: jest.fn(),
      listBookings: jest.fn().mockResolvedValue([]),
      getBooking: jest.fn(),
    };
    await queryClient.fetchQuery({
      queryKey: bookingKeys.lists(),
      queryFn: () => bookingRepository.listBookings(),
    });
    queryClient.setQueryData(availabilityKeys.all, []);
    queryClient.setQueryData(stayKeys.detail('booking-1', 'es'), {});

    invalidateAfterBookingCreated(queryClient, 'booking-1');

    expect(bookingRepository.listBookings).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(bookingKeys.lists())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(availabilityKeys.all)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(stayKeys.detail('booking-1', 'es'))?.isInvalidated).toBe(true);
  });
});
