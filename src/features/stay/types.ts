import type { Booking } from '@/features/booking/types';
import type { Property } from '@/features/property/types';

/**
 * My Stay projection: derived from a confirmed booking plus property data. There is no
 * persisted `stays` entity; this is intentionally a simple read model.
 */
export interface StayInfo {
  booking: Booking;
  property: Property;
}
