import type { QueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@/features/booking/queries/keys';
import { availabilityKeys } from '@/features/search/queries/use-availability-search';
import { stayKeys } from '@/features/stay/queries/use-stay';

/**
 * Explicit, booking-scoped cache invalidation.
 *
 * Kept small and central so every mutation invalidates the same roots: booking list,
 * booking detail, quotes, availability and My Stay. It lives in the booking feature and
 * imports other features' keys (one direction only), so there is no key duplication and
 * no circular dependency.
 */
export function invalidateAfterBookingCreated(queryClient: QueryClient, bookingId: string): void {
  // Lists, detail and quotes all live under `bookingKeys.all`.
  void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  // A new pending/confirmed booking can block inventory.
  void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
  // A confirmed booking now has stay information.
  void queryClient.invalidateQueries({ queryKey: stayKeys.byBooking(bookingId) });
}
