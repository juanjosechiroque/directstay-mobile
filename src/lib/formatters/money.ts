/**
 * Money formatting.
 *
 * Money is always handled in integer minor units (USD 120.00 → 12000) with an explicit
 * currency. Formatting is deterministic across Hermes/Node so prices render identically
 * in the app and in tests; no floating point arithmetic is involved.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  PEN: 'S/',
  EUR: '€',
  GBP: '£',
};

function isSpanish(locale: string): boolean {
  return !locale.startsWith('en');
}

export function toMajorUnits(amountMinor: number, fractionDigits = 2): string {
  const negative = amountMinor < 0;
  const absolute = Math.abs(Math.trunc(amountMinor));
  const factor = 10 ** fractionDigits;
  const major = Math.floor(absolute / factor);
  const minor = absolute % factor;
  return `${negative ? '-' : ''}${major}.${String(minor).padStart(fractionDigits, '0')}`;
}

export function formatMinorUnits(
  amountMinor: number,
  currency: string,
  locale: string = 'es',
): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
  const [major, cents] = toMajorUnits(amountMinor).split('.');
  const sign = major.startsWith('-') ? '-' : '';
  const unsignedMajor = major.replace('-', '');
  // The decimal separator is always "." regardless of locale; only thousands grouping and
  // the space after the symbol follow Spanish typographic convention.
  const groupSeparator = ',';
  const decimalSeparator = '.';
  const grouped = unsignedMajor.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  const spaced = isSpanish(locale) ? ' ' : '';
  return `${sign}${symbol}${spaced}${grouped}${decimalSeparator}${cents}`;
}
