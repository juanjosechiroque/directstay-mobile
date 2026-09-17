import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { Property } from '@/features/property/types';
import { normalizeLocale } from '@/lib/locale';
import { useRepositories } from '@/lib/repositories';

export const propertyKeys = {
  all: ['property'] as const,
  catalog: (locale: string) => [...propertyKeys.all, 'catalog', locale] as const,
  unit: (unitId: string, locale: string) => [...propertyKeys.all, 'unit', unitId, locale] as const,
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

/**
 * The first catalog property, used where a single default context is needed (for example
 * the property timezone that drives search defaults). Never used to hide private data.
 */
export function usePrimaryProperty() {
  const query = useCatalog();
  const primary: Property | undefined = query.data?.[0]?.property;
  return { ...query, data: primary };
}

export function useUnit(unitId: string | undefined) {
  const { property } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: propertyKeys.unit(unitId ?? 'missing', locale),
    queryFn: () => property.getUnit(unitId as string, locale),
    enabled: Boolean(unitId),
  });
}
