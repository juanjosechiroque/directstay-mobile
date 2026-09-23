import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { clearUserScopedQueries } from '@/features/auth/queries/invalidation';
import { SessionProvider } from '@/features/auth/session/session-provider';
import { bookingKeys } from '@/features/booking/queries/keys';
import { propertyKeys } from '@/features/property/queries/use-property';
import { availabilityKeys } from '@/features/search/queries/use-availability-search';
import { stayKeys } from '@/features/stay/queries/use-stay';
import type { DatabaseClient } from '@/lib/supabase/client';

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
    queryClient.setQueryData(propertyKeys.catalog('es'), []);
    queryClient.setQueryData(availabilityKeys.all, []);

    clearUserScopedQueries(queryClient);

    expect(queryClient.getQueryData(bookingKeys.lists())).toBeUndefined();
    expect(queryClient.getQueryData(stayKeys.detail('b-1', 'es'))).toBeUndefined();
    // Public, organization-scoped data stays cached.
    expect(queryClient.getQueryData(propertyKeys.catalog('es'))).toEqual([]);
    expect(queryClient.getQueryData(availabilityKeys.all)).toEqual([]);
  });

  it('clears identity-scoped queries when SessionProvider receives SIGNED_IN', async () => {
    const queryClient = createClient();
    queryClient.setQueryData(bookingKeys.lists(), []);
    queryClient.setQueryData(stayKeys.detail('b-1', 'es'), {});
    queryClient.setQueryData(propertyKeys.catalog('es'), []);

    type AuthEventListener = (
      event: string,
      session: { user: { id: string; is_anonymous: boolean } } | null,
    ) => void;
    let authEventListener: AuthEventListener | undefined;
    const client = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: jest.fn((listener: AuthEventListener) => {
          authEventListener = listener;
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
      },
    } as unknown as DatabaseClient;

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SessionProvider, { client }, createElement('test-child')),
        ),
      );
    });

    await act(async () => {
      authEventListener?.('SIGNED_IN', {
        user: { id: 'anonymous-guest', is_anonymous: true },
      });
    });

    expect(queryClient.getQueryData(bookingKeys.lists())).toBeUndefined();
    expect(queryClient.getQueryData(stayKeys.detail('b-1', 'es'))).toBeUndefined();
    expect(queryClient.getQueryData(propertyKeys.catalog('es'))).toEqual([]);
    await act(async () => renderer.unmount());
  });
});
