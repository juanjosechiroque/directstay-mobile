import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SessionProvider, useSession } from '@/features/auth/session/session-provider';
import type { DatabaseClient } from '@/lib/supabase/client';

function StatusProbe() {
  const { status } = useSession();
  return createElement(Text, { testID: 'session-status' }, status);
}

function clientWithGetSession(getSession: jest.Mock): DatabaseClient {
  return {
    auth: {
      getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  } as unknown as DatabaseClient;
}

describe('SessionProvider session restore', () => {
  it('retries a transient read failure and keeps the guest signed in', async () => {
    jest.useFakeTimers();
    try {
      const getSession = jest
        .fn()
        .mockResolvedValueOnce({
          data: { session: null },
          error: { code: 'unexpected_failure', message: 'network request failed', status: 0 },
        })
        .mockResolvedValueOnce({
          data: { session: { user: { id: 'guest-1', is_anonymous: true } } },
          error: null,
        });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      const client = clientWithGetSession(getSession);

      let renderer!: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          createElement(
            QueryClientProvider,
            { client: queryClient },
            createElement(SessionProvider, { client }, createElement(StatusProbe)),
          ),
        );
      });

      // The first read failed; the provider is waiting out its backoff before retrying.
      expect(getSession).toHaveBeenCalledTimes(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      expect(getSession).toHaveBeenCalledTimes(2);
      expect(renderer.root.findByProps({ testID: 'session-status' }).props.children).toBe(
        'signedIn',
      );
      await act(async () => renderer.unmount());
    } finally {
      jest.useRealTimers();
    }
  });
});
