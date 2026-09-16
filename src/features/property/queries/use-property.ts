import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { normalizeLocale } from '@/lib/locale';
import { useRepositories } from '@/lib/repositories';

export const propertyKeys = {
  all: ['property'] as const,
  detail: (locale: string) => [...propertyKeys.all, 'detail', locale] as const,
  units: (locale: string) => [...propertyKeys.all, 'units', locale] as const,
  unit: (unitId: string, locale: string) => [...propertyKeys.all, 'unit', unitId, locale] as const,
};

export function useProperty() {
  const { property } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: propertyKeys.detail(locale),
    queryFn: () => property.getProperty(locale),
  });
}

export function useUnits() {
  const { property } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: propertyKeys.units(locale),
    queryFn: () => property.listUnits(locale),
  });
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
