import { screen, userEvent } from '@testing-library/react-native';

import { DateField } from '@/features/search/components/DateField';
import { formatIsoDate } from '@/lib/dates';
import { renderWithProviders } from '@/test/render';

const TODAY = '2026-10-01';

describe('DateField', () => {
  it('exposes the empty field as a button named with the placeholder and its hint', async () => {
    await renderWithProviders(
      <DateField label="Llegada" value={null} onChange={jest.fn()} placeholder="Elige fecha" />,
    );

    const field = screen.getByRole('button', { name: 'Llegada: Elige fecha' });
    expect(field).toHaveProp('accessibilityHint', 'Abre el calendario para elegir una fecha');
  });

  it('names the field with the formatted value once a date is set', async () => {
    await renderWithProviders(
      <DateField
        label="Salida"
        value="2026-11-10"
        onChange={jest.fn()}
        placeholder="Elige fecha"
      />,
    );

    expect(
      screen.getByRole('button', { name: `Salida: ${formatIsoDate('2026-11-10', 'es')}` }),
    ).toBeOnTheScreen();
  });

  it('reports the disabled state and the error message', async () => {
    await renderWithProviders(
      <DateField
        label="Llegada"
        value={null}
        onChange={jest.fn()}
        placeholder="Elige fecha"
        disabled
        error="Elige una fecha."
      />,
    );

    expect(screen.getByRole('button', { name: 'Llegada: Elige fecha' })).toBeDisabled();
    expect(screen.getByText('Elige una fecha.')).toBeOnTheScreen();
  });

  it('opens the calendar and reports the selected date as an ISO business date', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <DateField
        label="Llegada"
        value={null}
        onChange={onChange}
        placeholder="Elige fecha"
        todayDate={TODAY}
      />,
    );

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Llegada: Elige fecha' }));

    expect(screen.getByText('octubre de 2026')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'martes, 20 de octubre de 2026' }));

    expect(onChange).toHaveBeenCalledWith('2026-10-20');
  });
});
