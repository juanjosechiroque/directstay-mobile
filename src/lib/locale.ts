/**
 * Locale primitives.
 *
 * Kept outside the i18next instance so framework-agnostic contracts (repositories,
 * formatters) can depend on the locale type without pulling in React or i18next. The
 * i18n module re-exports these values.
 */

export const SUPPORTED_LOCALES = ['es', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export function normalizeLocale(value: string | undefined | null): Locale {
  return value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
