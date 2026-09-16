import { QueryClient } from '@tanstack/react-query';

/**
 * Central TanStack Query client.
 *
 * The app uses TanStack Query for *all* asynchronous/server state from the start, even
 * while the current source is local mock data. That keeps screens and hooks written
 * against the server-state pattern, so replacing mock repositories with Supabase later
 * does not require rewriting the UI layer.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
