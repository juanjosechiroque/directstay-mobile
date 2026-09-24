import { screen, userEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { AccessibilityInfo } from 'react-native';

import { StayScreen } from '@/features/stay/screens/StayScreen';
import type { StayInfo } from '@/features/stay/types';
import { buildBooking } from '@/test/fixtures';
import { fakeRepositories, renderWithProviders } from '@/test/render';
import { resetRouter, setParams } from '@/test/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

const stay: StayInfo = {
  booking: buildBooking(),
  propertyName: 'Ayni Mountain Cabins',
  checkInTime: '15:00',
  checkOutTime: '12:00',
  contactWhatsapp: '+51987654321',
  contactPhone: '+51987654321',
  information: {
    wifiNetwork: 'AyniWifi',
    wifiPassword: 'secreto-123',
    breakfastInfo: 'De 7 a 10',
    checkinInstructions: 'La llave está en la caja',
    directions: 'Segunda calle a la derecha',
  },
};

describe('StayScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetRouter();
    setParams({ bookingId: 'booking-1' });
  });

  it('shows a labelled loading state while the stay loads', async () => {
    const repositories = fakeRepositories({
      stay: { getStay: jest.fn(() => new Promise(() => undefined)) },
    });
    await renderWithProviders(<StayScreen />, { repositories });

    expect(await screen.findByRole('progressbar', { name: 'Cargando…' })).toBeOnTheScreen();
  });

  it('shows private stay details for a confirmed booking owned by the guest', async () => {
    const getStay = jest.fn().mockResolvedValue(stay);
    await renderWithProviders(<StayScreen />, {
      repositories: fakeRepositories({ stay: { getStay } }),
    });

    expect(await screen.findByText('secreto-123')).toBeOnTheScreen();
    expect(screen.getByText('AyniWifi')).toBeOnTheScreen();
    expect(screen.getByText('La llave está en la caja')).toBeOnTheScreen();
    expect(getStay).toHaveBeenCalledWith('booking-1', 'es');
  });

  it('copies the Wi-Fi password and announces it', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const getStay = jest.fn().mockResolvedValue(stay);
    await renderWithProviders(<StayScreen />, {
      repositories: fakeRepositories({ stay: { getStay } }),
    });
    await screen.findByText('secreto-123');

    await user.press(screen.getByRole('button', { name: 'Copiar contraseña' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('secreto-123');
    expect(announce).toHaveBeenCalledWith('Contraseña copiada');
    announce.mockRestore();
  });

  it('shows the unavailable state and no private data when the server returns no stay', async () => {
    const getStay = jest.fn().mockResolvedValue(null);
    await renderWithProviders(<StayScreen />, {
      repositories: fakeRepositories({ stay: { getStay } }),
    });

    expect(await screen.findByText('Mi estancia aún no está disponible')).toBeOnTheScreen();
    expect(screen.queryByText('Wi-Fi')).not.toBeOnTheScreen();
    expect(screen.queryByText('secreto-123')).not.toBeOnTheScreen();
  });

  it('does not request private information without a guest session', async () => {
    const getStay = jest.fn().mockResolvedValue(stay);
    await renderWithProviders(<StayScreen />, {
      repositories: fakeRepositories({ stay: { getStay } }),
      signedIn: false,
    });

    expect(await screen.findByText('Mi estancia aún no está disponible')).toBeOnTheScreen();
    expect(getStay).not.toHaveBeenCalled();
    expect(screen.queryByText('secreto-123')).not.toBeOnTheScreen();
  });

  it('shows an error and loads the stay after retry', async () => {
    const getStay = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(stay);
    await renderWithProviders(<StayScreen />, {
      repositories: fakeRepositories({ stay: { getStay } }),
    });

    expect(await screen.findByText('No pudimos cargar la información')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('secreto-123')).toBeOnTheScreen();
  });
});
