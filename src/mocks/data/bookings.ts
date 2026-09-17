import type { Booking, BookingStatus, CancellationReason } from '@/features/booking/types';
import { addDays, diffInNights, todayIso, type IsoDate } from '@/lib/dates';

import { DEMO_PROFILE_ID, MOCK_PROPERTY_BASE, OTHER_GUEST_PROFILE_ID } from './property';
import {
  INTI_UNIT_ID,
  KILLA_UNIT_ID,
  SUMAQ_UNIT_ID,
  WAYRA_UNIT_ID,
  findMockUnitSeed,
} from './units';

/**
 * DEMO / MOCK DATA ONLY — seeded bookings for the local demo profile and for fictional
 * other guests (the latter exist so availability search has real blocking inventory).
 *
 * Dates are relative to "today" so the demo always shows eligible and non-eligible
 * cancellations, pending holds, canceled and refunded bookings.
 */

const NOW = new Date();
const today = todayIso();
const iso = (offsetDays: number): IsoDate => addDays(today, offsetDays);
const minutesAgo = (minutes: number): string =>
  new Date(NOW.getTime() - minutes * 60_000).toISOString();

interface SeedBookingInput {
  id: string;
  profileId: string;
  unitId: string;
  status: BookingStatus;
  checkIn: IsoDate;
  nights: number;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  createdMinutesAgo: number;
  cancellationReason?: CancellationReason;
}

function seedBooking(input: SeedBookingInput): Booking {
  const unit = findMockUnitSeed(input.unitId);
  if (!unit) {
    throw new Error(`Unknown mock unit: ${input.unitId}`);
  }

  const createdAt = minutesAgo(input.createdMinutesAgo);
  const holdExpiresAt = new Date(new Date(createdAt).getTime() + 5 * 60_000).toISOString();
  const checkOut = addDays(input.checkIn, input.nights);
  const confirmedAt =
    input.status === 'CONFIRMED' || input.status === 'REFUNDED'
      ? minutesAgo(input.createdMinutesAgo - 1)
      : null;
  const canceledAt = input.status === 'CANCELED' ? minutesAgo(input.createdMinutesAgo - 1) : null;
  const refundedAt = input.status === 'REFUNDED' ? minutesAgo(input.createdMinutesAgo - 2) : null;

  return {
    id: input.id,
    guestProfileId: input.profileId,
    unitId: unit.id,
    unitName: unit.name,
    propertyId: unit.propertyId,
    propertyName: MOCK_PROPERTY_BASE.name,
    propertyTimezone: MOCK_PROPERTY_BASE.timezone,
    propertyCheckInTime: MOCK_PROPERTY_BASE.checkInTime,
    propertyCheckOutTime: MOCK_PROPERTY_BASE.checkOutTime,
    propertyWhatsapp: MOCK_PROPERTY_BASE.contact.whatsapp,
    propertyPhone: MOCK_PROPERTY_BASE.contact.phone,
    status: input.status,
    checkIn: input.checkIn,
    checkOut,
    nights: diffInNights(input.checkIn, checkOut),
    guestCount: input.guestCount,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    currency: unit.currency,
    nightlyRateMinor: unit.nightlyRateMinor,
    totalAmountMinor: unit.nightlyRateMinor * input.nights,
    holdExpiresAt,
    createdAt,
    confirmedAt,
    canceledAt,
    cancellationReason: input.cancellationReason ?? null,
    refundedAt,
  };
}

/** Bookings owned by the demo profile (shown in "Mis reservas"). */
export const MOCK_OWN_BOOKINGS: Booking[] = [
  seedBooking({
    id: '55555555-5555-5555-5555-555555555501',
    profileId: DEMO_PROFILE_ID,
    unitId: KILLA_UNIT_ID,
    status: 'CONFIRMED',
    checkIn: iso(12),
    nights: 3,
    guestCount: 2,
    guestName: 'Valeria Quispe',
    guestEmail: 'valeria.demo@directstay.test',
    guestPhone: '+51 999 000 111',
    createdMinutesAgo: 60 * 24 * 3,
  }),
  seedBooking({
    id: '55555555-5555-5555-5555-555555555502',
    profileId: DEMO_PROFILE_ID,
    unitId: INTI_UNIT_ID,
    status: 'PENDING_PAYMENT',
    checkIn: iso(30),
    nights: 2,
    guestCount: 3,
    guestName: 'Valeria Quispe',
    guestEmail: 'valeria.demo@directstay.test',
    guestPhone: '+51 999 000 111',
    createdMinutesAgo: 2,
  }),
  seedBooking({
    id: '55555555-5555-5555-5555-555555555503',
    profileId: DEMO_PROFILE_ID,
    unitId: WAYRA_UNIT_ID,
    status: 'CANCELED',
    checkIn: iso(-20),
    nights: 2,
    guestCount: 2,
    guestName: 'Valeria Quispe',
    guestEmail: 'valeria.demo@directstay.test',
    guestPhone: '+51 999 000 111',
    createdMinutesAgo: 60 * 24 * 40,
    cancellationReason: 'HOLD_EXPIRED',
  }),
  seedBooking({
    id: '55555555-5555-5555-5555-555555555504',
    profileId: DEMO_PROFILE_ID,
    unitId: SUMAQ_UNIT_ID,
    status: 'REFUNDED',
    checkIn: iso(-40),
    nights: 3,
    guestCount: 5,
    guestName: 'Valeria Quispe',
    guestEmail: 'valeria.demo@directstay.test',
    guestPhone: '+51 999 000 111',
    createdMinutesAgo: 60 * 24 * 70,
  }),
  seedBooking({
    id: '55555555-5555-5555-5555-555555555505',
    profileId: DEMO_PROFILE_ID,
    unitId: INTI_UNIT_ID,
    status: 'CONFIRMED',
    checkIn: iso(1),
    nights: 1,
    guestCount: 2,
    guestName: 'Valeria Quispe',
    guestEmail: 'valeria.demo@directstay.test',
    guestPhone: '+51 999 000 111',
    createdMinutesAgo: 60 * 24 * 2,
  }),
];

/** Bookings owned by other fictional guests (inventory blocking only, never listed). */
export const MOCK_FOREIGN_BOOKINGS: Booking[] = [
  seedBooking({
    id: '66666666-6666-6666-6666-666666666601',
    profileId: OTHER_GUEST_PROFILE_ID,
    unitId: KILLA_UNIT_ID,
    status: 'CONFIRMED',
    checkIn: iso(60),
    nights: 5,
    guestCount: 2,
    guestName: 'Diego Salazar',
    guestEmail: 'diego.salazar@example.test',
    guestPhone: null,
    createdMinutesAgo: 60 * 24 * 10,
  }),
  seedBooking({
    id: '66666666-6666-6666-6666-666666666602',
    profileId: OTHER_GUEST_PROFILE_ID,
    unitId: WAYRA_UNIT_ID,
    status: 'CONFIRMED',
    checkIn: iso(80),
    nights: 4,
    guestCount: 3,
    guestName: 'Marta Cárdenas',
    guestEmail: 'marta.cardenas@example.test',
    guestPhone: null,
    createdMinutesAgo: 60 * 24 * 12,
  }),
];

export const MOCK_BOOKINGS: Booking[] = [...MOCK_OWN_BOOKINGS, ...MOCK_FOREIGN_BOOKINGS];
