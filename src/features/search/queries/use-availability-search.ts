import { useQuery } from '@tanstack/react-query';

import type { AvailabilityQuery } from '@/features/search/types';
import { useRepositories } from '@/lib/repositories';

export const availabilityKeys = {
  all: ['availability'] as const,
  search: (query: AvailabilityQuery) =>
    [...availabilityKeys.all, 'search', query.checkIn, query.checkOut, query.guests] as const,
};

export function useAvailabilitySearch(criteria: AvailabilityQuery | null) {
  const { availability } = useRepositories();
  return useQuery({
    queryKey: availabilityKeys.search(criteria ?? { checkIn: '', checkOut: '', guests: 0 }),
    queryFn: () => availability.searchAvailableUnits(criteria as AvailabilityQuery),
    enabled: criteria !== null,
  });
}
