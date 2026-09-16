import { todayIso, addDays } from '@/lib/dates';

import { SUMAQ_UNIT_ID } from './units';

/**
 * DEMO / MOCK DATA ONLY — non-booking unavailability (maintenance). Availability blocks
 * are a separate model from bookings and must also be considered by availability search.
 */

export interface MockAvailabilityBlock {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}

const today = todayIso();

export const MOCK_AVAILABILITY_BLOCKS: MockAvailabilityBlock[] = [
  {
    id: '77777777-7777-7777-7777-777777777701',
    unitId: SUMAQ_UNIT_ID,
    checkIn: addDays(today, 14),
    checkOut: addDays(today, 16),
    reason: 'Mantenimiento de terraza',
  },
];
