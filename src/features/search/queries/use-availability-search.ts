import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { AvailabilityQuery } from '@/features/search/types';
import { normalizeLocale } from '@/lib/locale';
import { useRepositories } from '@/lib/repositories';

export const availabilityKeys = {
  all: ['availability'] as const,
  search: (query: AvailabilityQuery, locale: string) =>
    [
      ...availabilityKeys.all,
      'search',
      query.propertyId,
      query.unitId ?? null,
      query.checkIn,
      query.checkOut,
      query.guests,
      locale,
    ] as const,
};

export function useAvailabilitySearch(criteria: AvailabilityQuery | null) {
  const { availability } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: availabilityKeys.search(
      criteria ?? { propertyId: '', checkIn: '', checkOut: '', guests: 0 },
      locale,
    ),
    queryFn: () => availability.searchAvailableUnits(criteria as AvailabilityQuery, locale),
    enabled: criteria !== null,
  });
}
