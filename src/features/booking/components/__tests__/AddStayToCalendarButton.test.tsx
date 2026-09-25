import { screen, userEvent } from '@testing-library/react-native';
import * as Calendar from 'expo-calendar';
import { AddStayToCalendarButton } from '@/features/booking/components/AddStayToCalendarButton';
import { buildBooking } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

jest.mock('expo-calendar', () => ({
  requestCalendarPermissions: jest.fn(),
  getCalendars: jest.fn(),
  EntityTypes: { EVENT: 'event' },
}));

describe('AddStayToCalendarButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['PENDING_PAYMENT', 'CANCELED', 'REFUNDED'] as const)(
    'is hidden for %s bookings',
    async (status) => {
      await renderWithProviders(<AddStayToCalendarButton booking={buildBooking({ status })} />);
      expect(screen.queryByRole('button', { name: 'Añadir estancia al calendario' })).toBeNull();
    },
  );

  it('is available only on confirmed bookings and handles denied permission', async () => {
    jest
      .mocked(Calendar.requestCalendarPermissions)
      .mockResolvedValue({ status: 'denied' } as never);
    const user = userEvent.setup();
    await renderWithProviders(<AddStayToCalendarButton booking={buildBooking()} />);
    await user.press(screen.getByRole('button', { name: 'Añadir estancia al calendario' }));
    expect(await screen.findByText(/Sin permiso/)).toBeOnTheScreen();
    expect(Calendar.getCalendars).not.toHaveBeenCalled();
  });

  it('shows a localized message when the native calendar form fails', async () => {
    jest
      .mocked(Calendar.requestCalendarPermissions)
      .mockResolvedValue({ status: 'granted' } as never);
    jest.mocked(Calendar.getCalendars).mockRejectedValue(new Error('no calendar'));
    const user = userEvent.setup();
    await renderWithProviders(<AddStayToCalendarButton booking={buildBooking()} />);
    await user.press(screen.getByRole('button', { name: 'Añadir estancia al calendario' }));
    expect(await screen.findByText(/No hay un calendario disponible/)).toBeOnTheScreen();
  });
});
