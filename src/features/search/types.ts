import type { Unit } from '@/features/property/types';
import type { IsoDate } from '@/lib/dates';

export interface AvailabilityQuery {
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
}

/** A unit returned by an availability search, with the server-provided price snapshot. */
export interface AvailableUnit {
  unit: Unit;
  nights: number;
  totalAmountMinor: number;
  currency: string;
}
