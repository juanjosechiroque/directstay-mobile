import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/lib/repositories';

export const stayKeys = {
  all: ['stay'] as const,
  detail: (bookingId: string) => [...stayKeys.all, 'detail', bookingId] as const,
};

export function useStay(bookingId: string | undefined) {
  const { stay } = useRepositories();
  return useQuery({
    queryKey: stayKeys.detail(bookingId ?? 'missing'),
    queryFn: () => stay.getStay(bookingId as string),
    enabled: Boolean(bookingId),
  });
}
