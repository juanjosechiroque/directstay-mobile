import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { normalizeLocale } from '@/lib/locale';
import { useRepositories } from '@/lib/repositories';

export const propertyKeys = {
  all: ['property'] as const,
  catalog: (locale: string) => [...propertyKeys.all, 'catalog', locale] as const,
  /** Accepts `undefined` so the query hook can key before a unit id exists. */
  unit: (unitId: string | undefined, locale: string) =>
    [...propertyKeys.all, 'unit', unitId, locale] as const,
};

/**
 * Public catalog: every active property of the configured organization with its active
 * units and localized, license-annotated media. No session required.
 */
export function useCatalog() {
  const { property } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: propertyKeys.catalog(locale),
    queryFn: () => property.getCatalog(locale),
  });
}

export function useUnit(unitId: string | undefined) {
  const { property } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: propertyKeys.unit(unitId, locale),
    queryFn: unitId ? () => property.getUnit(unitId, locale) : skipToken,
  });
}
