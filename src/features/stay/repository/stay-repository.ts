import type { StayInfo } from '@/features/stay/types';
import type { Locale } from '@/lib/locale';

export interface StayRepository {
  getStay(bookingId: string, locale: Locale): Promise<StayInfo | null>;
}
