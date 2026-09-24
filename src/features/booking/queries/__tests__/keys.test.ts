import { bookingKeys } from '@/features/booking/queries/keys';
import { propertyKeys } from '@/features/property/queries/use-property';
import { availabilityKeys } from '@/features/search/queries/use-availability-search';
import { stayKeys } from '@/features/stay/queries/use-stay';

describe('query keys', () => {
  it('scopes the quote key by unit, dates and guests', () => {
    const base = { unitId: 'unit-1', checkIn: '2026-10-10', checkOut: '2026-10-12', guestCount: 2 };
    const key = bookingKeys.quote(base);
    expect(key).toEqual(expect.arrayContaining(['unit-1', '2026-10-10', '2026-10-12', 2]));

    expect(bookingKeys.quote({ ...base, guestCount: 3 })).not.toEqual(key);
    expect(bookingKeys.quote({ ...base, checkOut: '2026-10-13' })).not.toEqual(key);
  });

  it('scopes availability by criteria and locale', () => {
    const query = {
      propertyId: 'property-1',
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      guests: 2,
    };
    expect(availabilityKeys.search(query, 'es')).not.toEqual(availabilityKeys.search(query, 'en'));
    expect(availabilityKeys.search(query, 'es')).not.toEqual(
      availabilityKeys.search({ ...query, guests: 3 }, 'es'),
    );
  });

  it('scopes catalog and stay keys by locale', () => {
    expect(propertyKeys.catalog('es')).not.toEqual(propertyKeys.catalog('en'));
    expect(stayKeys.detail('b-1', 'es')).not.toEqual(stayKeys.detail('b-1', 'en'));
    expect(stayKeys.byBooking('b-1')).toEqual(expect.arrayContaining(['b-1']));
  });
});
