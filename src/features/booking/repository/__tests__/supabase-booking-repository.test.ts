import { SupabaseBookingRepository } from '@/features/booking/repository/supabase-booking-repository';
import type { DatabaseClient } from '@/lib/supabase/client';

const row = {
  id: 'a0000000-0000-0000-0000-000000000001',
  guest_profile_id: 'b0000000-0000-0000-0000-000000000001',
  unit_id: 'c0000000-0000-0000-0000-000000000001',
  status: 'PENDING_PAYMENT',
  check_in: '2028-05-01',
  check_out: '2028-05-03',
  guest_count: 2,
  guest_name: 'Guest',
  guest_email: 'guest@example.test',
  guest_phone: null,
  special_requests: null,
  currency: 'USD',
  nightly_rate_minor: 12000,
  total_amount_minor: 24000,
  hold_expires_at: '2028-04-01T12:05:00Z',
  created_at: '2028-04-01T12:00:00Z',
  confirmed_at: null,
  canceled_at: null,
  cancellation_reason: null,
  refunded_at: null,
  units: {
    name: 'Test unit',
    property_id: 'd0000000-0000-0000-0000-000000000001',
    properties: {
      name: 'Test property',
      timezone: 'America/Lima',
      check_in_time: '15:00:00',
      check_out_time: '12:00:00',
      contact_whatsapp: null,
      contact_phone: null,
    },
  },
};

function setup(rpcRow: Record<string, unknown>) {
  const rpc = jest.fn().mockResolvedValue({ data: rpcRow, error: null });
  const maybeSingle = jest.fn().mockResolvedValue({ data: { ...row, ...rpcRow }, error: null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  const repository = new SupabaseBookingRepository(
    { rpc, from } as unknown as DatabaseClient,
    'test-brand',
  );
  return { repository, rpc, eq };
}

describe('SupabaseBookingRepository mutations', () => {
  it('creates via RPC without sending price and maps the persisted row', async () => {
    const { repository, rpc, eq } = setup(row);
    const booking = await repository.createBooking({
      unitId: row.unit_id,
      checkIn: row.check_in,
      checkOut: row.check_out,
      guestCount: 2,
      guestName: 'Guest',
      guestEmail: 'guest@example.test',
      guestPhone: null,
      specialRequests: null,
    });
    expect(rpc).toHaveBeenCalledWith('create_booking', {
      p_unit_id: row.unit_id,
      p_check_in: row.check_in,
      p_check_out: row.check_out,
      p_guest_count: 2,
      p_guest_name: 'Guest',
      p_guest_email: 'guest@example.test',
      p_guest_phone: null,
      p_special_requests: null,
    });
    expect(eq).toHaveBeenCalledWith('id', row.id);
    expect(booking).toMatchObject({ id: row.id, unitName: 'Test unit', totalAmountMinor: 24000 });
  });

  it('confirms via RPC with only the booking id and maps the confirmed row', async () => {
    const { repository, rpc } = setup({
      ...row,
      status: 'CONFIRMED',
      confirmed_at: row.created_at,
    });
    const booking = await repository.confirmDemoPayment(row.id);
    expect(rpc).toHaveBeenCalledWith('confirm_demo_payment', { p_booking_id: row.id });
    expect(booking).toMatchObject({ status: 'CONFIRMED', totalAmountMinor: 24000 });
  });

  it('turns an expired response into the translated error', async () => {
    const { repository } = setup({
      ...row,
      status: 'CANCELED',
      cancellation_reason: 'HOLD_EXPIRED',
    });
    await expect(repository.confirmDemoPayment(row.id)).rejects.toMatchObject({
      code: 'error.holdExpired',
    });
  });

  it('rejects a malformed RPC response before navigating with its id', async () => {
    const { repository, eq } = setup({ status: 'UNKNOWN' });
    await expect(
      repository.createBooking({
        unitId: row.unit_id,
        checkIn: row.check_in,
        checkOut: row.check_out,
        guestCount: 2,
        guestName: 'Guest',
        guestEmail: 'guest@example.test',
        guestPhone: null,
        specialRequests: null,
      }),
    ).rejects.toMatchObject({ code: 'error.generic' });
    expect(eq).not.toHaveBeenCalled();
  });
});
