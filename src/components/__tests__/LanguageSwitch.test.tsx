import { screen, userEvent } from '@testing-library/react-native';

import { LanguageSwitch } from '@/components/LanguageSwitch';
import { renderWithProviders } from '@/test/render';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('LanguageSwitch', () => {
  it('exposes both locales as labelled buttons and marks the active one selected', async () => {
    await renderWithProviders(<LanguageSwitch />);

    expect(screen.getByRole('button', { name: 'Español' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'English' })).not.toBeSelected();
  });

  it('changes the app language and the selected state when the other locale is pressed', async () => {
    const { i18n } = await renderWithProviders(<LanguageSwitch />);

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'English' }));

    expect(i18n.language.startsWith('en')).toBe(true);
    expect(screen.getByRole('button', { name: 'English' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Español' })).not.toBeSelected();
  });
});
