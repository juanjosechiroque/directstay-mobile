import type { Booking } from '@/features/booking/types';

/**
 * Private stay information, delivered only to the authenticated owner of a CONFIRMED
 * booking through the `get_stay_information` RPC. It is never part of the public catalog
 * read model.
 */
export interface StayInformation {
  wifiNetwork: string | null;
  wifiPassword: string | null;
  breakfastInfo: string | null;
  checkinInstructions: string | null;
  directions: string | null;
}

/**
 * My Stay projection: derived from a confirmed booking plus the property's public data
 * and the owner-only private stay information. There is no persisted `stays` entity.
 */
export interface StayInfo {
  booking: Booking;
  propertyName: string;
  checkInTime: string;
  checkOutTime: string;
  contactWhatsapp: string | null;
  contactPhone: string | null;
  information: StayInformation;
}
