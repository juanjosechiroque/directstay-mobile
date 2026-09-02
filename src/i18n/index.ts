import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export const DEFAULT_LOCALE = 'es';
export const SUPPORTED_LOCALES = ['es', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

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
