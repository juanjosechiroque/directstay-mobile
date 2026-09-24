import { screen, userEvent } from '@testing-library/react-native';

import { GuestCounter } from '@/features/search/components/GuestCounter';
import { renderWithProviders } from '@/test/render';

describe('GuestCounter', () => {
  it('announces the current value on both steppers and changes it by one', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<GuestCounter value={2} max={4} onChange={onChange} />);

    const add = screen.getByRole('button', { name: 'Agregar un huésped' });
    const remove = screen.getByRole('button', { name: 'Quitar un huésped' });
    expect(add).toHaveAccessibilityValue({ text: '2 huéspedes' });
    expect(remove).toHaveAccessibilityValue({ text: '2 huéspedes' });

    const user = userEvent.setup();
    await user.press(add);
    expect(onChange).toHaveBeenLastCalledWith(3);
    await user.press(remove);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('disables the decrement at the minimum and the increment at the maximum', async () => {
    const { rerender } = await renderWithProviders(
      <GuestCounter value={1} max={3} onChange={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Quitar un huésped' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar un huésped' })).toBeEnabled();

    await rerender(<GuestCounter value={3} max={3} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Agregar un huésped' })).toBeDisabled();
  });

  it('uses the singular form for one guest and shows an error message', async () => {
    await renderWithProviders(
      <GuestCounter value={1} max={3} onChange={jest.fn()} error="Indica al menos un huésped." />,
    );
    expect(screen.getByText('1 huésped')).toBeOnTheScreen();
    expect(screen.getByText('Indica al menos un huésped.')).toBeOnTheScreen();
  });

  it('disables both steppers when the whole control is disabled', async () => {
    await renderWithProviders(<GuestCounter value={2} max={4} disabled onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Agregar un huésped' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quitar un huésped' })).toBeDisabled();
  });
});
