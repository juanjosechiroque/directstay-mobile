import { act, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { BookingPaymentScreen } from '@/features/booking/screens/BookingPaymentScreen';
import { AppError } from '@/lib/errors';
import { TEST_NOW, buildBooking } from '@/test/fixtures';
import { fakeRepositories, renderWithProviders } from '@/test/render';
import { resetRouter, router, setParams } from '@/test/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));

const PAY = 'Pagar (demostración)';
const pending = buildBooking({ status: 'PENDING_PAYMENT', confirmedAt: null });

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('BookingPaymentScreen (demo checkout)', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let announce: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ now: TEST_NOW });
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    resetRouter();
    setParams({ bookingId: 'booking-1' });
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    announce.mockRestore();
  });

  function setup(confirmDemoPayment = jest.fn().mockResolvedValue(buildBooking())) {
    const repositories = fakeRepositories({
      booking: { getBooking: jest.fn().mockResolvedValue(pending), confirmDemoPayment },
    });
    return { repositories, confirmDemoPayment };
  }

  it('shows the server-persisted total and a countdown to the hold deadline', async () => {
    const { repositories } = setup();
    await renderWithProviders(<BookingPaymentScreen />, { repositories });

    expect(await screen.findByText('Tiempo para pagar: 05:00')).toBeOnTheScreen();
    expect(screen.getByText('No se realiza ningún cargo')).toBeOnTheScreen();

    await advance(61_000);
    expect(screen.getByText('Tiempo para pagar: 03:59')).toBeOnTheScreen();
  });

  it('announces only milestones to screen readers, not every second', async () => {
    const { repositories } = setup();
    await renderWithProviders(<BookingPaymentScreen />, { repositories });
    await screen.findByText('Tiempo para pagar: 05:00');
    expect(announce).not.toHaveBeenCalled();

    await advance(240_000); // 01:00 left
    expect(announce).toHaveBeenCalledWith('Quedan 01:00 para pagar');
    await advance(20_000); // 00:40, no new milestone
    expect(announce).toHaveBeenCalledTimes(1);
    await advance(10_000); // 00:30
    expect(announce).toHaveBeenLastCalledWith('Quedan 00:30 para pagar');
  });

  it('expires the hold: disables payment and offers a new search', async () => {
    const { repositories, confirmDemoPayment } = setup();
    await renderWithProviders(<BookingPaymentScreen />, { repositories });
    await screen.findByText('Tiempo para pagar: 05:00');

    await advance(300_000);

    expect(screen.getByText('La reserva venció')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: PAY })).toBeDisabled();
    expect(announce).toHaveBeenLastCalledWith(
      'El tiempo para pagar terminó. Busca otra vez para reservar.',
    );
    await user.press(screen.getByRole('button', { name: 'Volver a buscar' }));
    expect(router.replace).toHaveBeenCalledWith('/search');
    expect(confirmDemoPayment).not.toHaveBeenCalled();
  });

  it('does not treat the booking as confirmed until the server responds', async () => {
    let resolve!: (value: ReturnType<typeof buildBooking>) => void;
    const confirmDemoPayment = jest.fn(
      () => new Promise<ReturnType<typeof buildBooking>>((r) => (resolve = r)),
    );
    const { repositories } = setup(confirmDemoPayment);
    await renderWithProviders(<BookingPaymentScreen />, { repositories });

    await user.press(await screen.findByRole('button', { name: PAY }));

    expect(confirmDemoPayment).toHaveBeenCalledWith('booking-1');
    expect(screen.getByRole('button', { name: PAY })).toBeBusy();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => resolve(buildBooking()));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/booking/confirmed',
      params: { bookingId: 'booking-1' },
    });
  });

  it('ignores repeated taps while the confirmation is in flight', async () => {
    const confirmDemoPayment = jest.fn(() => new Promise<never>(() => undefined));
    const { repositories } = setup(confirmDemoPayment);
    await renderWithProviders(<BookingPaymentScreen />, { repositories });

    const button = await screen.findByRole('button', { name: PAY });
    await user.press(button);
    await user.press(button);
    expect(confirmDemoPayment).toHaveBeenCalledTimes(1);
  });

  it('shows the failure with retry and stays on the screen when the server rejects', async () => {
    const confirmDemoPayment = jest
      .fn()
      .mockRejectedValueOnce(new AppError('error.generic'))
      .mockResolvedValue(buildBooking());
    const { repositories } = setup(confirmDemoPayment);
    await renderWithProviders(<BookingPaymentScreen />, { repositories });

    await user.press(await screen.findByRole('button', { name: PAY }));
    expect(await screen.findByText('No pudimos confirmar tu reserva')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/booking/confirmed',
      params: { bookingId: 'booking-1' },
    });
  });

  it('shows the expired state when the server reports the hold expired', async () => {
    const confirmDemoPayment = jest.fn().mockRejectedValue(new AppError('error.holdExpired'));
    const { repositories } = setup(confirmDemoPayment);
    await renderWithProviders(<BookingPaymentScreen />, { repositories });

    await user.press(await screen.findByRole('button', { name: PAY }));

    expect(await screen.findByText('La reserva venció')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a retry when the booking cannot be loaded', async () => {
    const getBooking = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(pending);
    const repositories = fakeRepositories({ booking: { getBooking } });
    await renderWithProviders(<BookingPaymentScreen />, { repositories });

    await user.press(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: PAY })).toBeOnTheScreen();
  });
});
