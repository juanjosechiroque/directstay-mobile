/**
 * Business-date helpers.
 *
 * Booking dates are business `DATE`s (`YYYY-MM-DD`) in the property timezone and follow
 * the interval `[checkIn, checkOut)` (check-in inclusive, check-out exclusive). We keep
 * them as plain strings and do arithmetic in UTC to avoid floating timezone drift.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type IsoDate = string;

export function isIsoDate(value: string | null | undefined): value is IsoDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseIsoDate(value: IsoDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): IsoDate {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(now: Date = new Date()): IsoDate {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const date = parseIsoDate(value);
  return toIsoDate(new Date(date.getTime() + days * MS_PER_DAY));
}

/** Number of nights in `[checkIn, checkOut)`. Zero or negative when the range is invalid. */
export function diffInNights(checkIn: IsoDate, checkOut: IsoDate): number {
  return Math.round(
    (parseIsoDate(checkOut).getTime() - parseIsoDate(checkIn).getTime()) / MS_PER_DAY,
  );
}

/**
 * Half-open overlap: true when `[aStart, aEnd)` intersects `[bStart, bEnd)`.
 * Same-day turnover (`aEnd === bStart`) is explicitly allowed and returns false.
 */
export function rangesOverlap(
  aStart: IsoDate,
  aEnd: IsoDate,
  bStart: IsoDate,
  bEnd: IsoDate,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function localeTag(locale: string): string {
  return locale.startsWith('en') ? 'en-US' : 'es-PE';
}

export function formatIsoDate(
  value: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const date = parseIsoDate(value);
  return new Intl.DateTimeFormat(localeTag(locale), { ...options, timeZone: 'UTC' }).format(date);
}

export function formatDateRange(checkIn: IsoDate, checkOut: IsoDate, locale: string): string {
  return `${formatIsoDate(checkIn, locale)} – ${formatIsoDate(checkOut, locale)}`;
}

export function formatInstant(value: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDateWithWeekday(value: IsoDate, locale: string): string {
  return formatIsoDate(value, locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}
