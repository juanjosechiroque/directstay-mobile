import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { AvailabilityQuery } from '@/features/search/types';
import { normalizeLocale } from '@/lib/locale';
import { useRepositories } from '@/lib/repositories';

export const availabilityKeys = {
  all: ['availability'] as const,
  /** Accepts `null` so the query hook can key before criteria exist. */
  search: (query: AvailabilityQuery | null, locale: string) =>
    [
      ...availabilityKeys.all,
      'search',
      query?.propertyId ?? null,
      query?.unitId ?? null,
      query?.checkIn ?? null,
      query?.checkOut ?? null,
      query?.guests ?? null,
      locale,
    ] as const,
};

export function useAvailabilitySearch(criteria: AvailabilityQuery | null) {
  const { availability } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: availabilityKeys.search(criteria, locale),
    queryFn: criteria ? () => availability.searchAvailableUnits(criteria, locale) : skipToken,
  });
}
