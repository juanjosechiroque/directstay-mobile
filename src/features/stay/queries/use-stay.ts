import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { normalizeLocale } from '@/lib/locale';
import { useRepositories } from '@/lib/repositories';

export const stayKeys = {
  all: ['stay'] as const,
  /** All locales for one booking, used by invalidation/removal after a mutation. */
  byBooking: (bookingId: string) => [...stayKeys.all, 'detail', bookingId] as const,
  detail: (bookingId: string, locale: string) =>
    [...stayKeys.byBooking(bookingId), locale] as const,
};

export function useStay(bookingId: string | undefined) {
  const { stay } = useRepositories();
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);
  return useQuery({
    queryKey: stayKeys.detail(bookingId ?? 'missing', locale),
    queryFn: () => stay.getStay(bookingId as string, locale),
    enabled: Boolean(bookingId),
  });
}
