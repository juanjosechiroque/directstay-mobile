import { screen } from '@testing-library/react-native';

import { TextField } from '@/components/TextField';
import { renderWithProviders } from '@/test/render';

describe('TextField', () => {
  it('names the input with its label and exposes disabled state', async () => {
    await renderWithProviders(<TextField label="Nombre" editable={false} />);

    const input = screen.getByLabelText('Nombre');
    expect(input).toBeDisabled();
  });

  it('marks a required field in its accessible name and keeps the required marker out of it', async () => {
    await renderWithProviders(<TextField label="Nombre completo" required />);

    expect(screen.getByLabelText('Nombre completo, obligatorio')).toBeOnTheScreen();
  });

  it('announces the validation error and shows its message', async () => {
    await renderWithProviders(<TextField label="Correo" error="Escribe tu correo." />);

    const input = screen.getByLabelText('Correo');
    expect(input).toHaveProp('accessibilityHint', 'Escribe tu correo.');
    expect(screen.getByText('Escribe tu correo.')).toBeOnTheScreen();
  });

  it('uses the helper as the hint until an error replaces it', async () => {
    const { rerender } = await renderWithProviders(
      <TextField label="Teléfono" helper="Solo números" />,
    );
    expect(screen.getByLabelText('Teléfono')).toHaveProp('accessibilityHint', 'Solo números');

    await rerender(<TextField label="Teléfono" helper="Solo números" error="Inválido" />);
    expect(screen.getByLabelText('Teléfono')).toHaveProp('accessibilityHint', 'Inválido');
  });
});
