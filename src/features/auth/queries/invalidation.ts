import type { QueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@/features/booking/queries/keys';
import { profileKeys } from '@/features/profile/queries/use-profile';
import { stayKeys } from '@/features/stay/queries/use-stay';

/**
 * Clears user-scoped caches when the session changes.
 *
 * Catalog and availability are public and organization-scoped, so they are left intact.
 * Profile, bookings and stay are identity-scoped: removing them prevents one account's
 * data from ever flashing for another after login/logout.
 */
export function clearUserScopedQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: profileKeys.all });
  queryClient.removeQueries({ queryKey: bookingKeys.all });
  queryClient.removeQueries({ queryKey: stayKeys.all });
}
