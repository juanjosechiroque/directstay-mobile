import { QueryClient } from '@tanstack/react-query';

/**
 * Central TanStack Query client.
 *
 * The app uses TanStack Query for asynchronous server state. This keeps screens and
 * hooks independent from the data source and centralizes caching and retries.
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
