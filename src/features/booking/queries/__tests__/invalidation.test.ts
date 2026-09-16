import { QueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@/features/booking/queries/use-booking';
import {
  invalidateAfterBookingCanceled,
  invalidateAfterBookingCreated,
} from '@/features/booking/queries/invalidation';
import { availabilityKeys } from '@/features/search/queries/use-availability-search';
import { stayKeys } from '@/features/stay/queries/use-stay';
import { addDays, todayIso } from '@/lib/dates';
import { KILLA_UNIT_ID } from '@/mocks/data/units';
import { MockAvailabilityRepository } from '@/mocks/repositories/availability-repository';
import { MockBookingRepository } from '@/mocks/repositories/booking-repository';
import { resetMockBookingStore } from '@/mocks/repositories/booking-store';
import { MockPropertyRepository } from '@/mocks/repositories/property-repository';
import { MockStayRepository } from '@/mocks/repositories/stay-repository';
import { setMockLatencyEnabled, setMockScenario } from '@/mocks/repositories/scenario';

function createClient(): QueryClient {
  // `gcTime: Infinity` prevents background GC timers from keeping Jest alive.
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

describe('booking cache invalidation', () => {
  it('invalidates booking, availability and stay roots after creating a booking', () => {
    const queryClient = createClient();
    queryClient.setQueryData(bookingKeys.lists(), []);
    queryClient.setQueryData(availabilityKeys.all, []);
    queryClient.setQueryData(stayKeys.detail('booking-1', 'es'), {});

    invalidateAfterBookingCreated(queryClient, 'booking-1');

    expect(queryClient.getQueryState(bookingKeys.lists())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(availabilityKeys.all)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(stayKeys.detail('booking-1', 'es'))?.isInvalidated).toBe(true);
  });

  it('removes the cached stay and invalidates availability after canceling', () => {
    const queryClient = createClient();
    queryClient.setQueryData(bookingKeys.detail('booking-1'), { id: 'booking-1' });
    queryClient.setQueryData(availabilityKeys.all, []);
    queryClient.setQueryData(stayKeys.detail('booking-1', 'es'), {});

    invalidateAfterBookingCanceled(queryClient, 'booking-1');

    // A refunded booking must not keep any cached My Stay entry.
    expect(queryClient.getQueryState(stayKeys.detail('booking-1', 'es'))).toBeUndefined();
    expect(queryClient.getQueryState(bookingKeys.detail('booking-1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(availabilityKeys.all)?.isInvalidated).toBe(true);
  });
});

describe('mock data consistency after mutations', () => {
  const property = new MockPropertyRepository();
  const availability = new MockAvailabilityRepository();
  const booking = new MockBookingRepository();
  const stay = new MockStayRepository(booking, property);

  const checkIn = addDays(todayIso(), 340);
  const checkOut = addDays(checkIn, 3);
  const query = { checkIn, checkOut, guests: 2 };

  beforeAll(() => {
    setMockLatencyEnabled(false);
  });

  beforeEach(() => {
    setMockScenario('success');
    resetMockBookingStore();
  });

  it('blocks availability once created, frees it on refund, and drops My Stay', async () => {
    const before = await availability.searchAvailableUnits(query, 'es');
    expect(before.map((result) => result.unit.name)).toContain('Killa');

    const created = await booking.createBooking({
      unitId: KILLA_UNIT_ID,
      checkIn,
      checkOut,
      guestCount: 2,
      guestName: 'Valeria Quispe',
      guestEmail: 'valeria.demo@directstay.test',
      guestPhone: null,
    });

    const pending = await availability.searchAvailableUnits(query, 'es');
    expect(pending.map((result) => result.unit.name)).not.toContain('Killa');

    await booking.simulatePayment(created.id);
    const confirmed = await availability.searchAvailableUnits(query, 'es');
    expect(confirmed.map((result) => result.unit.name)).not.toContain('Killa');
    await expect(stay.getStay(created.id, 'es')).resolves.not.toBeNull();

    await booking.cancelBooking(created.id);
    const refunded = await availability.searchAvailableUnits(query, 'es');
    expect(refunded.map((result) => result.unit.name)).toContain('Killa');
    await expect(stay.getStay(created.id, 'es')).resolves.toBeNull();
  });
});
