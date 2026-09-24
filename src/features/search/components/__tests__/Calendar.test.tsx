import { screen, userEvent } from '@testing-library/react-native';

import { Calendar } from '@/features/search/components/Calendar';
import { renderWithProviders } from '@/test/render';

const TODAY = '2026-10-01';

describe('Calendar', () => {
  it('labels every day with its full date and marks today', async () => {
    await renderWithProviders(<Calendar selected={null} onSelect={jest.fn()} todayDate={TODAY} />);

    expect(
      screen.getByRole('button', { name: /^jueves, 1 de octubre de 2026, Hoy$/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'viernes, 2 de octubre de 2026' })).toBeOnTheScreen();
    expect(screen.getByText('octubre de 2026')).toBeOnTheScreen();
  });

  it('marks the selected day as selected and disables days before the minimum date', async () => {
    await renderWithProviders(
      <Calendar
        selected="2026-10-10"
        onSelect={jest.fn()}
        todayDate={TODAY}
        minDate="2026-10-05"
      />,
    );

    expect(screen.getByRole('button', { name: 'sábado, 10 de octubre de 2026' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'jueves, 1 de octubre de 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'lunes, 5 de octubre de 2026' })).toBeEnabled();
  });

  it('reports the tapped date as an ISO business date', async () => {
    const onSelect = jest.fn();
    await renderWithProviders(<Calendar selected={null} onSelect={onSelect} todayDate={TODAY} />);

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'martes, 20 de octubre de 2026' }));
    expect(onSelect).toHaveBeenCalledWith('2026-10-20');
  });

  it('does not allow going to a month before the minimum date and can move forward', async () => {
    await renderWithProviders(<Calendar selected={null} onSelect={jest.fn()} todayDate={TODAY} />);

    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled();
  });
});
