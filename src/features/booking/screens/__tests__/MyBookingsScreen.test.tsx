import { act, screen, userEvent } from '@testing-library/react-native';

import { MyBookingsScreen } from '@/features/booking/screens/MyBookingsScreen';
import { buildBooking } from '@/test/fixtures';
import { fakeRepositories, renderWithProviders } from '@/test/render';
import { resetRouter, router } from '@/test/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));

function repositoriesWith(listBookings: jest.Mock) {
  return fakeRepositories({ booking: { listBookings } });
}

describe('MyBookingsScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => resetRouter());

  it('shows a labelled loading placeholder while bookings load', async () => {
    const repositories = repositoriesWith(jest.fn(() => new Promise(() => undefined)));
    await renderWithProviders(<MyBookingsScreen />, { repositories });

    expect(await screen.findByRole('progressbar', { name: 'Cargando…' })).toBeOnTheScreen();
  });

  it('shows the empty state with a way to start a search', async () => {
    const repositories = repositoriesWith(jest.fn().mockResolvedValue([]));
    await renderWithProviders(<MyBookingsScreen />, { repositories });

    expect(await screen.findByText('Aún no tienes reservas')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('shows the empty state and does not read bookings without a guest session', async () => {
    const listBookings = jest.fn();
    await renderWithProviders(<MyBookingsScreen />, {
      repositories: repositoriesWith(listBookings),
      signedIn: false,
    });

    expect(await screen.findByText('Aún no tienes reservas')).toBeOnTheScreen();
    expect(listBookings).not.toHaveBeenCalled();
  });

  it('shows an error and loads the list after retry', async () => {
    const listBookings = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue([buildBooking()]);
    await renderWithProviders(<MyBookingsScreen />, {
      repositories: repositoriesWith(listBookings),
    });

    expect(await screen.findByText('No pudimos cargar tus reservas')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: 'Killa. Confirmada' })).toBeOnTheScreen();
  });

  it('lists bookings and opens the tapped one', async () => {
    const bookings = [
      buildBooking({ id: 'b-1', unitName: 'Killa' }),
      buildBooking({ id: 'b-2', unitName: 'Inti', status: 'PENDING_PAYMENT' }),
    ];
    await renderWithProviders(<MyBookingsScreen />, {
      repositories: repositoriesWith(jest.fn().mockResolvedValue(bookings)),
    });

    expect(await screen.findByRole('button', { name: 'Inti. Pago pendiente' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Killa. Confirmada' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/bookings/[bookingId]',
      params: { bookingId: 'b-1' },
    });
  });

  it('refetches on pull-to-refresh', async () => {
    const listBookings = jest.fn().mockResolvedValue([buildBooking()]);
    await renderWithProviders(<MyBookingsScreen />, {
      repositories: repositoriesWith(listBookings),
    });
    await screen.findByRole('button', { name: 'Killa. Confirmada' });
    expect(listBookings).toHaveBeenCalledTimes(1);

    const { refreshControl } = screen.getByTestId('my-bookings-list').props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(listBookings).toHaveBeenCalledTimes(2);
  });

  it('keeps the list when a refresh fails and offers retry above it', async () => {
    const listBookings = jest
      .fn()
      .mockResolvedValueOnce([buildBooking()])
      .mockRejectedValue(new Error('offline'));
    await renderWithProviders(<MyBookingsScreen />, {
      repositories: repositoriesWith(listBookings),
    });
    await screen.findByRole('button', { name: 'Killa. Confirmada' });

    const { refreshControl } = screen.getByTestId('my-bookings-list').props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(await screen.findByText('No pudimos cargar tus reservas')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Killa. Confirmada' })).toBeOnTheScreen();
  });

  it('virtualizes long lists instead of mounting every booking', async () => {
    const bookings = Array.from({ length: 200 }, (_, i) =>
      buildBooking({ id: `b-${i}`, unitName: `Unit ${i}` }),
    );
    await renderWithProviders(<MyBookingsScreen />, {
      repositories: repositoriesWith(jest.fn().mockResolvedValue(bookings)),
    });

    expect(await screen.findByRole('button', { name: /^Unit 0\./ })).toBeOnTheScreen();
    expect(screen.queryAllByRole('button', { name: /^Unit \d+\./ }).length).toBeLessThan(50);
    expect(screen.queryByRole('button', { name: /^Unit 199\./ })).not.toBeOnTheScreen();
  });
});
