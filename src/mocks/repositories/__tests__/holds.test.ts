import { KILLA_UNIT_ID } from '@/mocks/data/units';
import type { Clock } from '@/lib/clock';

import { MockAvailabilityRepository } from '../availability-repository';
import { MockBookingRepository } from '../booking-repository';
import { resetMockBookingStore } from '../booking-store';
import { setMockLatencyEnabled, setMockScenario } from '../scenario';

/**
 * Deterministic clock so hold expirations can be tested without waiting five real minutes.
 * Dates are far from the seeded demo data to isolate the behavior under test.
 */
const BASE = Date.parse('2026-06-01T12:00:00.000Z');
const HOLD_MS = 5 * 60_000;
let currentMs = BASE;
const clock: Clock = { now: () => new Date(currentMs) };
const advance = (ms: number) => {
  currentMs += ms;
};

const booking = new MockBookingRepository(clock);
const availability = new MockAvailabilityRepository(clock);

const checkIn = '2028-01-10';
const checkOut = '2028-01-13';
const guest = {
  guestName: 'Valeria Quispe',
  guestEmail: 'valeria.demo@directstay.test',
  guestPhone: '+51 999 000 111',
};

function newBookingInput() {
  return {
    unitId: KILLA_UNIT_ID,
    checkIn,
    checkOut,
    guestCount: 2,
    ...guest,
  };
}

beforeAll(() => {
  setMockLatencyEnabled(false);
});

beforeEach(() => {
  currentMs = BASE;
  setMockScenario('success');
  resetMockBookingStore();
});

afterEach(() => {
  setMockScenario('success');
});

describe('5-minute hold retention', () => {
  it('expires exactly five minutes after creation', async () => {
    const created = await booking.createBooking(newBookingInput());
    expect(created.createdAt).toBe(new Date(BASE).toISOString());
    expect(created.holdExpiresAt).toBe(new Date(BASE + HOLD_MS).toISOString());
  });

  it('keeps a valid hold blocking inventory and can be confirmed', async () => {
    const created = await booking.createBooking(newBookingInput());
    advance(HOLD_MS - 60_000);

    const results = await availability.searchAvailableUnits({ checkIn, checkOut, guests: 2 }, 'es');
    expect(results.map((result) => result.unit.name)).not.toContain('Killa');

    const payment = await booking.simulatePayment(created.id);
    expect(payment.outcome).toBe('CONFIRMED');
    expect(payment.booking.status).toBe('CONFIRMED');
  });

  it('releases inventory once the hold expires and never confirms late', async () => {
    const created = await booking.createBooking(newBookingInput());
    advance(HOLD_MS);

    const released = await availability.searchAvailableUnits(
      { checkIn, checkOut, guests: 2 },
      'es',
    );
    expect(released.map((result) => result.unit.name)).toContain('Killa');

    const payment = await booking.simulatePayment(created.id);
    expect(payment.outcome).toBe('EXPIRED');
    expect(payment.booking.status).toBe('CANCELED');
    expect(payment.booking.cancellationReason).toBe('HOLD_EXPIRED');
    expect(payment.booking.confirmedAt).toBeNull();
    expect(payment.booking.canceledAt).not.toBeNull();

    const stored = await booking.getBooking(created.id);
    expect(stored?.status).toBe('CANCELED');
  });

  it('allows a new booking for the freed range after expiry', async () => {
    const first = await booking.createBooking(newBookingInput());
    advance(HOLD_MS);

    const second = await booking.createBooking(newBookingInput());
    expect(second.id).not.toBe(first.id);
    expect(second.status).toBe('PENDING_PAYMENT');
  });

  it('transforms expired holds when listing bookings', async () => {
    const created = await booking.createBooking(newBookingInput());
    advance(HOLD_MS + 60_000);

    const list = await booking.listBookings();
    const found = list.find((item) => item.id === created.id);
    expect(found?.status).toBe('CANCELED');
    expect(found?.cancellationReason).toBe('HOLD_EXPIRED');
  });
});
