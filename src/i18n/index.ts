import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, normalizeLocale } from '@/lib/locale';

import en from './locales/en.json';
import es from './locales/es.json';

export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
export type { Locale } from '@/lib/locale';

const resources = {
  es: { translation: es },
  en: { translation: en },
};

const i18n = createInstance();

// DirectStay launches in Spanish unless the guest previously picked a language, which is
// persisted on the device. Device-language auto-detection remains a deferred product decision.
const LOCALE_STORAGE_KEY = 'directstay.locale';

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
});

void (async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) await i18n.changeLanguage(normalizeLocale(stored));
  } catch {
    // Storage unavailable: stay on the default locale.
  }
  i18n.on('languageChanged', (lng) => {
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(lng)).catch(() => undefined);
  });
})();

export default i18n;
