import type { Booking } from '@/features/booking/types';
import type { Property, Unit } from '@/features/property/types';
import type { AvailableUnit } from '@/features/search/types';

/** Fixed instant used by tests that need a deterministic clock. */
export const TEST_NOW = new Date('2026-10-01T12:00:00.000Z');

export function buildBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    guestProfileId: 'guest-1',
    unitId: 'unit-1',
    unitName: 'Killa',
    propertyId: 'property-1',
    propertyName: 'Ayni Mountain Cabins',
    propertyTimezone: 'America/Lima',
    propertyCheckInTime: '15:00',
    propertyCheckOutTime: '12:00',
    propertyWhatsapp: '+51987654321',
    propertyPhone: '+51987654321',
    status: 'CONFIRMED',
    checkIn: '2026-11-10',
    checkOut: '2026-11-12',
    nights: 2,
    guestCount: 2,
    guestName: 'Ana Quispe',
    guestEmail: 'ana@example.com',
    guestPhone: null,
    specialRequests: null,
    currency: 'USD',
    nightlyRateMinor: 12000,
    totalAmountMinor: 24000,
    holdExpiresAt: '2026-10-01T12:05:00.000Z',
    createdAt: '2026-10-01T12:00:00.000Z',
    confirmedAt: '2026-10-01T12:01:00.000Z',
    canceledAt: null,
    cancellationReason: null,
    refundedAt: null,
    ...overrides,
  };
}

export function buildUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'unit-1',
    propertyId: 'property-1',
    name: 'Killa',
    slug: 'killa',
    summary: 'Cabaña con chimenea',
    description: 'Cabaña de madera con vista a la montaña',
    maxGuests: 4,
    nightlyRateMinor: 12000,
    currency: 'USD',
    amenities: ['wifi'],
    images: [],
    ...overrides,
  };
}

export function buildProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-1',
    name: 'Ayni Mountain Cabins',
    slug: 'ayni-mountain-cabins',
    locationLabel: 'Urubamba, Cusco',
    mapReference: null,
    mapLatitude: null,
    mapLongitude: null,
    shortDescription: 'Refugio familiar en el Valle Sagrado',
    description: 'Refugio familiar en el Valle Sagrado',
    timezone: 'America/Lima',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    currency: 'USD',
    highlights: [],
    heroImage: null,
    contact: { whatsapp: null, phone: null },
    ...overrides,
  };
}

export function buildAvailableUnit(overrides: Partial<AvailableUnit> = {}): AvailableUnit {
  return {
    unit: buildUnit(),
    propertyId: 'property-1',
    propertyName: 'Ayni Mountain Cabins',
    propertySlug: 'ayni-mountain-cabins',
    propertyTimezone: 'America/Lima',
    nights: 2,
    totalAmountMinor: 24000,
    currency: 'USD',
    ...overrides,
  };
}
