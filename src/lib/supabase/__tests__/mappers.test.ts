import {
  mapBooking,
  mapCatalog,
  mapCatalogImage,
  mapStayInformation,
} from '@/lib/supabase/mappers';
import type { BookingRow, CatalogJson, StayInformationJson } from '@/lib/supabase/types';

const resolveMedia = (path: string) => `https://cdn.test/catalog-media/${path}`;

describe('catalog mappers', () => {
  it('resolves media URLs and keeps localized alt text', () => {
    const image = mapCatalogImage(
      { id: 'img-1', storagePath: 'ayni/killa.jpg', altText: 'Cabaña Killa' },
      resolveMedia,
    );
    expect(image).toEqual({
      id: 'img-1',
      url: 'https://cdn.test/catalog-media/ayni/killa.jpg',
      altText: 'Cabaña Killa',
    });
  });

  it('leaves the URL null for placeholder assets', () => {
    const image = mapCatalogImage({ id: 'img-2', storagePath: '', altText: null }, resolveMedia);
    expect(image.url).toBeNull();
  });

  it('maps a full catalog, dropping unknown amenity and highlight codes', () => {
    const payload = {
      organization: { id: 'org-1', name: 'Ayni Hospitality', slug: 'ayni-hospitality' },
      properties: [
        {
          id: 'prop-1',
          name: 'Ayni Mountain Cabins',
          slug: 'ayni-mountain-cabins',
          locationLabel: 'Valle Sagrado',
          shortDescription: 'Cabañas',
          description: 'Refugio',
          timezone: 'America/Lima',
          checkInTime: '15:00:00',
          checkOutTime: '12:00:00',
          currency: 'USD',
          contactWhatsapp: '+51999000111',
          contactPhone: null,
          highlights: ['mountain_view', 'not_a_highlight'],
          images: [{ id: 'hero', storagePath: 'hero.jpg', altText: null }],
          units: [
            {
              id: 'unit-1',
              propertyId: 'prop-1',
              name: 'Killa',
              slug: 'killa',
              maxGuests: 2,
              nightlyRateMinor: 12000,
              currency: 'USD',
              summary: 'Cabaña íntima',
              description: 'Descripción',
              amenities: ['wifi', 'unknown_amenity'],
              images: [],
            },
          ],
        },
      ],
    } as unknown as CatalogJson;

    const catalog = mapCatalog(payload, resolveMedia);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].property.checkInTime).toBe('15:00');
    expect(catalog[0].property.highlights).toEqual(['mountain_view']);
    expect(catalog[0].units[0].amenities).toEqual(['wifi']);
    expect(catalog[0].units[0].summary).toBe('Cabaña íntima');
  });
});

describe('booking mapper', () => {
  const row: BookingRow = {
    id: 'b-1',
    guest_profile_id: 'u-1',
    unit_id: 'unit-1',
    status: 'CONFIRMED',
    check_in: '2026-10-10',
    check_out: '2026-10-13',
    guest_count: 2,
    guest_name: 'Valeria',
    guest_email: 'v@example.test',
    guest_phone: null,
    currency: 'USD',
    nightly_rate_minor: 12000,
    total_amount_minor: 36000,
    hold_expires_at: '2026-10-01T00:05:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    confirmed_at: '2026-10-01T00:01:00.000Z',
    canceled_at: null,
    cancellation_reason: null,
    refunded_at: null,
    units: {
      name: 'Killa',
      property_id: 'prop-1',
      properties: {
        name: 'Ayni Mountain Cabins',
        timezone: 'America/Lima',
        check_in_time: '15:00:00',
        check_out_time: '12:00:00',
        contact_whatsapp: '+51999000111',
        contact_phone: '+51845550123',
      },
    },
  };

  it('computes nights and joins the public property context', () => {
    const booking = mapBooking(row);
    expect(booking.nights).toBe(3);
    expect(booking.propertyName).toBe('Ayni Mountain Cabins');
    expect(booking.propertyCheckInTime).toBe('15:00');
  });

  it('falls back to a safe status for unknown values', () => {
    const booking = mapBooking({ ...row, status: 'WEIRD', cancellation_reason: 'NOPE' });
    expect(booking.status).toBe('PENDING_PAYMENT');
    expect(booking.cancellationReason).toBeNull();
  });

  it('never fabricates private stay data from a booking row', () => {
    const booking = mapBooking(row) as unknown as Record<string, unknown>;
    expect(booking).not.toHaveProperty('wifiPassword');
    expect(booking).not.toHaveProperty('wifiNetwork');
  });
});

describe('stay information mapper', () => {
  it('maps only the private stay fields returned by the RPC', () => {
    const payload: StayInformationJson = {
      bookingId: 'b-1',
      wifiNetwork: 'AyniGuest',
      wifiPassword: 'secret',
      breakfastInfo: 'Desayuno',
      checkinInstructions: 'Instrucciones',
      directions: 'Direcciones',
    };
    expect(mapStayInformation(payload)).toEqual({
      wifiNetwork: 'AyniGuest',
      wifiPassword: 'secret',
      breakfastInfo: 'Desayuno',
      checkinInstructions: 'Instrucciones',
      directions: 'Direcciones',
    });
  });
});
