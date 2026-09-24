import { screen, userEvent } from '@testing-library/react-native';

import { BookingReviewScreen } from '@/features/booking/screens/BookingReviewScreen';
import { buildUnit } from '@/test/fixtures';
import { withDraft } from '@/test/draft';
import { fakeRepositories, renderWithProviders } from '@/test/render';
import { resetRouter, router, setParams } from '@/test/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));

// The server total is deliberately NOT nightlyRate x nights (12000 x 2 = 24000), so the test
// fails if the client ever computes the payable amount itself.
const serverQuote = {
  unitId: 'unit-1',
  checkIn: '2026-11-10',
  checkOut: '2026-11-12',
  nights: 2,
  guestCount: 2,
  nightlyRateMinor: 12000,
  totalAmountMinor: 98765,
  currency: 'USD',
};

function setup(getQuote = jest.fn().mockResolvedValue(serverQuote)) {
  const repositories = fakeRepositories({
    booking: { getQuote },
    property: { getUnit: jest.fn().mockResolvedValue(buildUnit()) },
  });
  return { repositories, getQuote };
}

describe('BookingReviewScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetRouter();
    setParams({ unitId: 'unit-1', checkIn: '2026-11-10', checkOut: '2026-11-12', guests: '2' });
  });

  it('shows the total returned by the server and requests it for the chosen stay', async () => {
    const { repositories, getQuote } = setup();
    await renderWithProviders(withDraft(<BookingReviewScreen />, { stay: null }), { repositories });

    expect(await screen.findByText('$ 987.65')).toBeOnTheScreen();
    expect(screen.queryByText('$ 240.00')).not.toBeOnTheScreen();
    expect(getQuote).toHaveBeenCalledWith({
      unitId: 'unit-1',
      checkIn: '2026-11-10',
      checkOut: '2026-11-12',
      guestCount: 2,
    });
  });

  it('continues to the guest step', async () => {
    const { repositories } = setup();
    await renderWithProviders(withDraft(<BookingReviewScreen />, { stay: null }), { repositories });

    await user.press(await screen.findByRole('button', { name: 'Continuar con los datos' }));
    expect(router.push).toHaveBeenCalledWith('/booking/guest');
  });

  it('shows a loading state while the quote is calculated', async () => {
    const { repositories } = setup(jest.fn(() => new Promise(() => undefined)));
    await renderWithProviders(withDraft(<BookingReviewScreen />, { stay: null }), { repositories });

    expect(await screen.findByRole('progressbar', { name: 'Cargando…' })).toBeOnTheScreen();
  });

  it('shows the quote error with retry, and the server price after retrying', async () => {
    const getQuote = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(serverQuote);
    const { repositories } = setup(getQuote);
    await renderWithProviders(withDraft(<BookingReviewScreen />, { stay: null }), { repositories });

    expect(await screen.findByText('No pudimos calcular el precio')).toBeOnTheScreen();
    expect(screen.queryByText('$ 240.00')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$ 987.65')).toBeOnTheScreen();
  });

  it('asks for a new search when the route has an impossible date', async () => {
    setParams({ unitId: 'unit-1', checkIn: '2026-13-99', checkOut: '2026-11-12', guests: '2' });
    const { repositories, getQuote } = setup();
    await renderWithProviders(withDraft(<BookingReviewScreen />, { stay: null }), { repositories });

    await user.press(await screen.findByRole('button', { name: 'Volver a buscar' }));
    expect(router.replace).toHaveBeenCalledWith('/search');
    expect(getQuote).not.toHaveBeenCalled();
  });
});
