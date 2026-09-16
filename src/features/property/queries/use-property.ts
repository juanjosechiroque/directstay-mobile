import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/lib/repositories';

export const propertyKeys = {
  all: ['property'] as const,
  detail: () => [...propertyKeys.all, 'detail'] as const,
  units: () => [...propertyKeys.all, 'units'] as const,
  unit: (unitId: string) => [...propertyKeys.all, 'unit', unitId] as const,
};

export function useProperty() {
  const { property } = useRepositories();
  return useQuery({
    queryKey: propertyKeys.detail(),
    queryFn: () => property.getProperty(),
  });
}

export function useUnits() {
  const { property } = useRepositories();
  return useQuery({
    queryKey: propertyKeys.units(),
    queryFn: () => property.listUnits(),
  });
}

export function useUnit(unitId: string | undefined) {
  const { property } = useRepositories();
  return useQuery({
    queryKey: propertyKeys.unit(unitId ?? 'missing'),
    queryFn: () => property.getUnit(unitId as string),
    enabled: Boolean(unitId),
  });
}
