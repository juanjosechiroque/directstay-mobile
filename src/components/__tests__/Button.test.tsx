import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/components/Button';

describe('Button', () => {
  it('exposes a button role with its title as accessible name and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Buscar" onPress={onPress} />);

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Buscar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress and reports the disabled state when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Buscar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Buscar' });
    expect(button).toBeDisabled();

    const user = userEvent.setup();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is busy and not pressable while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Pagar" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Pagar' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();

    const user = userEvent.setup();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
