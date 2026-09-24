import { screen, userEvent } from '@testing-library/react-native';

import { BookingGuestScreen } from '@/features/booking/screens/BookingGuestScreen';
import { AppError } from '@/lib/errors';
import { buildBooking } from '@/test/fixtures';
import { STAY_DRAFT, withDraft } from '@/test/draft';
import { fakeRepositories, renderWithProviders } from '@/test/render';
import { resetRouter, router } from '@/test/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));

const quote = {
  unitId: 'unit-1',
  checkIn: '2026-11-10',
  checkOut: '2026-11-12',
  nights: 2,
  guestCount: 2,
  nightlyRateMinor: 12000,
  totalAmountMinor: 24000,
  currency: 'USD',
};

const NAME = 'Nombre completo, obligatorio';
const EMAIL = 'Correo electrónico, obligatorio';
const CONTINUE = 'Continuar al pago';

type BookingOverrides = NonNullable<Parameters<typeof fakeRepositories>[0]>['booking'];

function setup(overrides: BookingOverrides = {}) {
  const createBooking = jest.fn().mockResolvedValue(buildBooking({ id: 'new-booking' }));
  const repositories = fakeRepositories({
    booking: { getQuote: jest.fn().mockResolvedValue(quote), createBooking, ...overrides },
  });
  return { repositories, createBooking };
}

describe('BookingGuestScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => resetRouter());

  it('sends the user back to search when there is no stay draft', async () => {
    const { repositories } = setup();
    await renderWithProviders(withDraft(<BookingGuestScreen />, { stay: null }), { repositories });

    expect(await screen.findByText('Falta información de la reserva')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Volver a buscar' }));
    expect(router.replace).toHaveBeenCalledWith('/search');
  });

  it('requires name and email and does not create a booking while they are missing', async () => {
    const { repositories, createBooking } = setup();
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });

    await screen.findByText('Total');
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(screen.getByText('Escribe tu nombre.')).toBeOnTheScreen();
    expect(screen.getByText('Escribe tu correo.')).toBeOnTheScreen();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('rejects an invalid email, a too short name and an invalid phone', async () => {
    const { repositories, createBooking } = setup();
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });
    await screen.findByText('Total');

    await user.type(screen.getByLabelText(NAME), 'A');
    await user.type(screen.getByLabelText(EMAIL), 'no-es-un-correo');
    await user.type(screen.getByLabelText('Número'), '12');
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(screen.getByText('El nombre es muy corto.')).toBeOnTheScreen();
    expect(screen.getByText('El correo no parece válido.')).toBeOnTheScreen();
    expect(screen.getByText('El teléfono no parece válido.')).toBeOnTheScreen();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('accepts a booking without phone or special requests and goes to payment', async () => {
    const { repositories, createBooking } = setup();
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });
    await screen.findByText('Total');

    await user.type(screen.getByLabelText(NAME), 'Ana Quispe');
    await user.type(screen.getByLabelText(EMAIL), 'ana@example.com');
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(createBooking).toHaveBeenCalledWith({
      ...STAY_DRAFT,
      guestCount: 2,
      guestName: 'Ana Quispe',
      guestEmail: 'ana@example.com',
      guestPhone: null,
      specialRequests: null,
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/booking/payment',
      params: { bookingId: 'new-booking' },
    });
  });

  it('sends the phone in international format and the trimmed special request', async () => {
    const { repositories, createBooking } = setup();
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });
    await screen.findByText('Total');

    await user.type(screen.getByLabelText(NAME), 'Ana Quispe');
    await user.type(screen.getByLabelText(EMAIL), 'ana@example.com');
    await user.type(screen.getByLabelText('Número'), '987654321');
    await user.type(screen.getByLabelText('Solicitudes especiales (opcional)'), '  Cuna  ');
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ guestPhone: '+51987654321', specialRequests: 'Cuna' }),
    );
  });

  it('reuses a live pending booking for the same stay instead of creating another', async () => {
    const createBooking = jest
      .fn()
      .mockResolvedValue(
        buildBooking({ id: 'pending-1', holdExpiresAt: '2999-01-01T00:00:00.000Z' }),
      );
    const repositories = fakeRepositories({
      booking: { getQuote: jest.fn().mockResolvedValue(quote), createBooking },
    });
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });
    await screen.findByText('Total');

    await user.type(screen.getByLabelText(NAME), 'Ana Quispe');
    await user.type(screen.getByLabelText(EMAIL), 'ana@example.com');
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/booking/payment',
      params: { bookingId: 'pending-1' },
    });

    // Coming back from payment and submitting again must not create a second pending booking.
    await user.press(screen.getByRole('button', { name: CONTINUE }));
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/booking/payment',
      params: { bookingId: 'pending-1' },
    });
  });

  it('prefills the form from the draft and keeps it after a failed attempt', async () => {
    const createBooking = jest.fn().mockRejectedValue(new AppError('error.unavailable'));
    const { repositories } = setup({ createBooking });
    const guest = {
      fullName: 'Ana Quispe',
      email: 'ana@example.com',
      phoneCountryCode: '51',
      phoneLocalNumber: '987654321',
      specialRequests: 'Cuna',
    };
    await renderWithProviders(withDraft(<BookingGuestScreen />, { guest }), { repositories });
    await screen.findByText('Total');

    expect(screen.getByLabelText(NAME)).toHaveDisplayValue('Ana Quispe');
    expect(screen.getByLabelText(EMAIL)).toHaveDisplayValue('ana@example.com');
    expect(screen.getByLabelText('Número')).toHaveDisplayValue('987654321');

    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(await screen.findByText('No pudimos crear tu reserva')).toBeOnTheScreen();
    expect(screen.getByText('La unidad ya no está disponible para esas fechas.')).toBeOnTheScreen();
    expect(screen.getByLabelText(NAME)).toHaveDisplayValue('Ana Quispe');
    expect(screen.getByTestId('draft-probe')).toHaveTextContent(/"fullName":"Ana Quispe"/);
    expect(router.push).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Volver a buscar' }));
    expect(router.replace).toHaveBeenCalledWith('/search');
  });

  it('stores what was typed in the draft when continuing', async () => {
    const { repositories } = setup();
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });
    await screen.findByText('Total');
    expect(screen.getByTestId('draft-probe')).toHaveTextContent('no-guest-draft');

    await user.type(screen.getByLabelText(NAME), 'Ana Quispe');
    await user.type(screen.getByLabelText(EMAIL), 'ana@example.com');
    await user.press(screen.getByRole('button', { name: CONTINUE }));

    expect(screen.getByTestId('draft-probe')).toHaveTextContent(/"email":"ana@example.com"/);
  });

  it('keeps continue disabled while the quote loads and offers retry when it fails', async () => {
    const getQuote = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(quote);
    const { repositories } = setup({ getQuote });
    await renderWithProviders(withDraft(<BookingGuestScreen />), { repositories });

    expect(await screen.findByText('No pudimos calcular el precio')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: CONTINUE })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Total')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: CONTINUE })).toBeEnabled();
  });
});
