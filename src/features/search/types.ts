import type { Unit } from '@/features/property/types';
import type { IsoDate } from '@/lib/dates';

export interface AvailabilityQuery {
  propertyId: string;
  unitId?: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
}

/**
 * A unit returned by the availability RPC, with the property context and the
 * server-provided price snapshot. The client never recomputes the payable amount.
 */
export interface AvailableUnit {
  unit: Unit;
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  propertyTimezone: string;
  nights: number;
  totalAmountMinor: number;
  currency: string;
}
