import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/locale';

import en from './locales/en.json';
import es from './locales/es.json';

export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
export type { Locale } from '@/lib/locale';

const resources = {
  es: { translation: es },
  en: { translation: en },
};

const i18n = createInstance();

// DirectStay always launches in Spanish. Device-language auto-detection is a
// product decision that is intentionally deferred; the architecture already
// allows adding it without touching any screen (see docs/DOMAIN.md).
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
