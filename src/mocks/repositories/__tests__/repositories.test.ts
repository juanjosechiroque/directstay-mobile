import { addDays, todayIso } from '@/lib/dates';
import { INTI_UNIT_ID, KILLA_UNIT_ID } from '@/mocks/data/units';

import { MockAvailabilityRepository } from '../availability-repository';
import { MockBookingRepository } from '../booking-repository';
import { resetMockBookingStore } from '../booking-store';
import { MockPropertyRepository } from '../property-repository';
import { MockStayRepository } from '../stay-repository';
import { setMockLatencyEnabled, setMockScenario } from '../scenario';

const property = new MockPropertyRepository();
const availability = new MockAvailabilityRepository();
const booking = new MockBookingRepository();
const stay = new MockStayRepository(booking, property);

const farCheckIn = addDays(todayIso(), 300);
const farCheckOut = addDays(farCheckIn, 3);

const guest = {
  guestName: 'Valeria Quispe',
  guestEmail: 'valeria.demo@directstay.test',
  guestPhone: '+51 999 000 111',
};

beforeAll(() => {
  setMockLatencyEnabled(false);
});

beforeEach(() => {
  setMockScenario('success');
  resetMockBookingStore();
});

afterEach(() => {
  setMockScenario('success');
});

describe('property repository', () => {
  it('serves the demo catalog through the contract', async () => {
    const data = await property.getProperty('es');
    expect(data.name).toBe('Ayni Mountain Cabins');
    expect(data.currency).toBe('USD');
    expect(data.checkInTime).toBe('15:00');
  });

  it('lists the four demo units with integer minor-unit rates', async () => {
    const units = await property.listUnits('es');
    expect(units.map((unit) => unit.name)).toEqual(['Killa', 'Inti', 'Wayra', 'Sumaq']);
    expect(units[0].nightlyRateMinor).toBe(12000);
    expect(Number.isInteger(units[0].nightlyRateMinor)).toBe(true);
  });

  it('returns null for an unknown unit', async () => {
    await expect(property.getUnit('does-not-exist', 'es')).resolves.toBeNull();
  });
});

describe('availability repository', () => {
  it('returns every compatible unit with a price snapshot', async () => {
    const results = await availability.searchAvailableUnits(
      { checkIn: farCheckIn, checkOut: farCheckOut, guests: 2 },
      'es',
    );
    expect(results).toHaveLength(4);
    expect(results[0].nights).toBe(3);
    expect(results[0].totalAmountMinor).toBe(results[0].unit.nightlyRateMinor * 3);
  });

  it('filters units by guest capacity', async () => {
    const results = await availability.searchAvailableUnits(
      { checkIn: farCheckIn, checkOut: farCheckOut, guests: 5 },
      'es',
    );
    expect(results.map((result) => result.unit.name)).toEqual(['Sumaq']);
  });

  it('excludes a unit blocked by an overlapping booking but allows turnover', async () => {
    const blocked = await availability.searchAvailableUnits(
      { checkIn: addDays(todayIso(), 13), checkOut: addDays(todayIso(), 14), guests: 2 },
      'es',
    );
    expect(blocked.map((result) => result.unit.name)).not.toContain('Killa');

    const turnover = await availability.searchAvailableUnits(
      { checkIn: addDays(todayIso(), 15), checkOut: addDays(todayIso(), 17), guests: 2 },
      'es',
    );
    expect(turnover.map((result) => result.unit.name)).toContain('Killa');
  });

  it('honours the empty scenario', async () => {
    setMockScenario('empty');
    await expect(
      availability.searchAvailableUnits(
        { checkIn: farCheckIn, checkOut: farCheckOut, guests: 2 },
        'es',
      ),
    ).resolves.toEqual([]);
  });

  it('throws an app error in the error scenario', async () => {
    setMockScenario('error');
    await expect(
      availability.searchAvailableUnits(
        { checkIn: farCheckIn, checkOut: farCheckOut, guests: 2 },
        'es',
      ),
    ).rejects.toMatchObject({ code: 'error.generic' });
  });
});

describe('booking repository', () => {
  it('quotes in integer minor units and never fabricates the total on the client', async () => {
    const quote = await booking.getQuote({
      unitId: KILLA_UNIT_ID,
      checkIn: farCheckIn,
      checkOut: farCheckOut,
      guestCount: 2,
    });
    expect(quote.nights).toBe(3);
    expect(quote.nightlyRateMinor).toBe(12000);
    expect(quote.totalAmountMinor).toBe(36000);
  });

  it('rejects a quote beyond the unit capacity', async () => {
    await expect(
      booking.getQuote({
        unitId: KILLA_UNIT_ID,
        checkIn: farCheckIn,
        checkOut: farCheckOut,
        guestCount: 3,
      }),
    ).rejects.toMatchObject({ code: 'error.validation' });
  });

  it('creates a pending booking and confirms it through the simulated payment', async () => {
    const created = await booking.createBooking({
      unitId: KILLA_UNIT_ID,
      checkIn: farCheckIn,
      checkOut: farCheckOut,
      guestCount: 2,
      ...guest,
    });
    expect(created.status).toBe('PENDING_PAYMENT');
    expect(created.holdExpiresAt).not.toBeNull();

    const result = await booking.simulatePayment(created.id);
    expect(result.demo).toBe(true);
    expect(result.outcome).toBe('CONFIRMED');
    expect(result.booking.status).toBe('CONFIRMED');

    const stored = await booking.getBooking(created.id);
    expect(stored?.status).toBe('CONFIRMED');
  });

  it('lists only bookings owned by the primary fixture identity', async () => {
    const list = await booking.listBookings();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.map((item) => item.id)).not.toContain('66666666-6666-6666-6666-666666666601');
  });

  it('prevents overlapping inventory claims for the same unit and range', async () => {
    const input = {
      unitId: INTI_UNIT_ID,
      checkIn: farCheckIn,
      checkOut: farCheckOut,
      guestCount: 2,
      ...guest,
    };
    await booking.createBooking(input);
    await expect(booking.createBooking(input)).rejects.toMatchObject({
      code: 'error.unavailable',
    });
  });

  it('refunds an eligible confirmed booking (CONFIRMED → REFUNDED)', async () => {
    const created = await booking.createBooking({
      unitId: KILLA_UNIT_ID,
      checkIn: farCheckIn,
      checkOut: farCheckOut,
      guestCount: 2,
      ...guest,
    });
    await booking.simulatePayment(created.id);

    const refunded = await booking.cancelBooking(created.id);
    expect(refunded.status).toBe('REFUNDED');
    expect(refunded.refundedAt).not.toBeNull();
    expect(refunded.cancellationReason).toBeNull();
  });

  it('refuses to cancel a booking that was never paid', async () => {
    const created = await booking.createBooking({
      unitId: KILLA_UNIT_ID,
      checkIn: farCheckIn,
      checkOut: farCheckOut,
      guestCount: 2,
      ...guest,
    });
    await expect(booking.cancelBooking(created.id)).rejects.toMatchObject({
      code: 'error.cancelNotAllowed',
    });
  });

  it('refuses cancellation inside the final 24 hours', async () => {
    const checkIn = todayIso();
    const created = await booking.createBooking({
      unitId: KILLA_UNIT_ID,
      checkIn,
      checkOut: addDays(checkIn, 1),
      guestCount: 2,
      ...guest,
    });
    await booking.simulatePayment(created.id);
    await expect(booking.cancelBooking(created.id)).rejects.toMatchObject({
      code: 'error.cancelNotAllowed',
    });
  });
});

describe('stay repository', () => {
  it('derives stay information only for confirmed bookings', async () => {
    const confirmedStay = await stay.getStay('55555555-5555-5555-5555-555555555501', 'es');
    expect(confirmedStay?.booking.status).toBe('CONFIRMED');
    expect(confirmedStay?.propertyName).toBe('Ayni Mountain Cabins');
    expect(confirmedStay?.information.wifiNetwork).toBe('AyniGuest');

    const pendingStay = await stay.getStay('55555555-5555-5555-5555-555555555502', 'es');
    expect(pendingStay).toBeNull();
  });
});

describe('mock scenarios', () => {
  it('empty only affects collections, not single resources', async () => {
    setMockScenario('empty');
    await expect(property.listUnits('es')).resolves.toEqual([]);
    await expect(booking.listBookings()).resolves.toEqual([]);

    const unit = await property.getUnit(KILLA_UNIT_ID, 'es');
    expect(unit?.name).toBe('Killa');
    const prop = await property.getProperty('es');
    expect(prop.name).toBe('Ayni Mountain Cabins');
    const quote = await booking.getQuote({
      unitId: KILLA_UNIT_ID,
      checkIn: farCheckIn,
      checkOut: farCheckOut,
      guestCount: 2,
    });
    expect(quote.totalAmountMinor).toBe(36000);
  });

  it('recovers after the error scenario is switched back to success', async () => {
    setMockScenario('error');
    await expect(property.getProperty('es')).rejects.toMatchObject({ code: 'error.generic' });

    setMockScenario('success');
    await expect(property.getProperty('es')).resolves.toMatchObject({
      name: 'Ayni Mountain Cabins',
    });
  });
});
