import { screen, userEvent } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';

import { TelemetryTestButton } from '@/lib/telemetry';
import { renderWithProviders } from '@/test/render';

describe('TelemetryTestButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends a tagged test event to Sentry when tapped', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TelemetryTestButton />);

    await user.press(
      screen.getByRole('button', { name: 'Enviar evento de prueba a Sentry (dev)' }),
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          operation: 'dev.telemetryTest',
          appErrorCode: 'error.generic',
        }),
      }),
    );
  });

  it('confirms the event was sent', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TelemetryTestButton />);

    await user.press(
      screen.getByRole('button', { name: 'Enviar evento de prueba a Sentry (dev)' }),
    );

    expect(screen.getByText('Evento enviado — revisa el panel de Sentry')).toBeOnTheScreen();
  });
});
