import i18n, { DEFAULT_LOCALE } from '../index';

describe('i18n index', () => {
  it('uses Spanish as the default locale', () => {
    expect(DEFAULT_LOCALE).toBe('es');
    expect(i18n.language).toBe('es');
  });

  it('returns Spanish translations by default', () => {
    expect(i18n.t('home.subtitle')).toBe(
      'Reservas directas y experiencia de estancia para alojamientos independientes.',
    );
  });

  it('returns the key itself when a translation is missing', () => {
    expect(i18n.t('home.notDefined')).toBe('home.notDefined');
  });

  it('falls back to the default locale for unsupported languages', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('home.subtitle')).toBe(
      'Reservas directas y experiencia de estancia para alojamientos independientes.',
    );
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it('resolves English translations when the language changes', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('home.subtitle')).toBe(
      'Direct booking and stay experience for independent accommodations.',
    );
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });
});
