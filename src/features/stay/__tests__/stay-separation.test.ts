import type { BookingRepository } from '@/features/booking/repository';
import type { Booking } from '@/features/booking/types';
import { SupabaseStayRepository } from '@/features/stay/repository/supabase-stay-repository';
import type { DatabaseClient } from '@/lib/supabase/client';

const CONFIRMED: Booking = {
  id: 'b-1',
  guestProfileId: 'u-1',
  unitId: 'unit-1',
  unitName: 'Killa',
  propertyId: 'prop-1',
  propertyName: 'Ayni Mountain Cabins',
  propertyTimezone: 'America/Lima',
  propertyCheckInTime: '15:00',
  propertyCheckOutTime: '12:00',
  propertyWhatsapp: '+51999000111',
  propertyPhone: '+51845550123',
  status: 'CONFIRMED',
  checkIn: '2026-10-10',
  checkOut: '2026-10-13',
  nights: 3,
  guestCount: 2,
  guestName: 'Valeria',
  guestEmail: 'v@example.test',
  guestPhone: null,
  currency: 'USD',
  nightlyRateMinor: 12000,
  totalAmountMinor: 36000,
  holdExpiresAt: '2026-10-01T00:05:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  confirmedAt: '2026-10-01T00:01:00.000Z',
  canceledAt: null,
  cancellationReason: null,
  refundedAt: null,
};

function bookingRepositoryReturning(booking: Booking | null): BookingRepository {
  return {
    getQuote: jest.fn(),
    listBookings: jest.fn(),
    getBooking: jest.fn().mockResolvedValue(booking),
    cancelBooking: jest.fn(),
  } as unknown as BookingRepository;
}

describe('stay read model separation', () => {
  it('does not expose private stay data for a non-confirmed booking', async () => {
    const rpc = jest.fn();
    const client = { rpc } as unknown as DatabaseClient;
    const repository = new SupabaseStayRepository(
      client,
      bookingRepositoryReturning({ ...CONFIRMED, status: 'PENDING_PAYMENT' }),
    );

    await expect(repository.getStay('b-1', 'es')).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reads private information only for a confirmed owner booking', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        bookingId: 'b-1',
        wifiNetwork: 'AyniGuest',
        wifiPassword: 'secret',
        breakfastInfo: 'Desayuno',
        checkinInstructions: 'Instrucciones',
        directions: 'Direcciones',
      },
      error: null,
    });
    const client = { rpc } as unknown as DatabaseClient;
    const repository = new SupabaseStayRepository(client, bookingRepositoryReturning(CONFIRMED));

    const stay = await repository.getStay('b-1', 'es');

    expect(rpc).toHaveBeenCalledWith('get_stay_information', { p_booking_id: 'b-1' });
    expect(stay?.information.wifiPassword).toBe('secret');
    expect(stay?.propertyName).toBe('Ayni Mountain Cabins');
    // The public catalog shape is not polluted with private fields.
    expect(Object.keys(stay ?? {})).not.toContain('wifi');
  });

  it('returns null when the RPC yields nothing', async () => {
    const client = {
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as DatabaseClient;
    const repository = new SupabaseStayRepository(client, bookingRepositoryReturning(CONFIRMED));
    await expect(repository.getStay('b-1', 'es')).resolves.toBeNull();
  });
});
