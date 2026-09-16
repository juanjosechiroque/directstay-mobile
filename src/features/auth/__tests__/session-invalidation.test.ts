import { QueryClient } from '@tanstack/react-query';

import { clearUserScopedQueries } from '@/features/auth/queries/invalidation';
import { bookingKeys } from '@/features/booking/queries/keys';
import { propertyKeys } from '@/features/property/queries/use-property';
import { availabilityKeys } from '@/features/search/queries/use-availability-search';
import { stayKeys } from '@/features/stay/queries/use-stay';

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

describe('session cache clearing', () => {
  it('drops identity-scoped caches but keeps the public catalog and availability', () => {
    const queryClient = createClient();
    queryClient.setQueryData(bookingKeys.lists(), []);
    queryClient.setQueryData(bookingKeys.detail('b-1'), {});
    queryClient.setQueryData(stayKeys.detail('b-1', 'es'), {});
    queryClient.setQueryData(['profile'], { id: 'u-1' });
    queryClient.setQueryData(propertyKeys.catalog('es'), []);
    queryClient.setQueryData(availabilityKeys.all, []);

    clearUserScopedQueries(queryClient);

    expect(queryClient.getQueryData(bookingKeys.lists())).toBeUndefined();
    expect(queryClient.getQueryData(stayKeys.detail('b-1', 'es'))).toBeUndefined();
    expect(queryClient.getQueryData(['profile'])).toBeUndefined();
    // Public, organization-scoped data stays cached.
    expect(queryClient.getQueryData(propertyKeys.catalog('es'))).toEqual([]);
    expect(queryClient.getQueryData(availabilityKeys.all)).toEqual([]);
  });
});
