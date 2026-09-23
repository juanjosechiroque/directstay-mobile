import type { QueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@/features/booking/queries/keys';
import { stayKeys } from '@/features/stay/queries/use-stay';

/**
 * Clears user-scoped caches when the session changes.
 *
 * Catalog and availability are public and organization-scoped, so they are left intact.
 * Bookings and stay are identity-scoped: removing them prevents data from flashing before
 * the newly created guest identity is established.
 */
export function clearUserScopedQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: bookingKeys.all });
  queryClient.removeQueries({ queryKey: stayKeys.all });
}
