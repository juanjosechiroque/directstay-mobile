import type { StayInfo } from '@/features/stay/types';

export interface StayRepository {
  getStay(bookingId: string): Promise<StayInfo | null>;
}
