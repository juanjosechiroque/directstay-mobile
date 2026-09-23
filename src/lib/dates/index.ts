/**
 * Business-date helpers.
 *
 * Booking dates are business `DATE`s (`YYYY-MM-DD`) in the property timezone and follow
 * the interval `[checkIn, checkOut)` (check-in inclusive, check-out exclusive). We keep
 * them as plain strings and do arithmetic in UTC to avoid floating timezone drift.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type IsoDate = string;

/**
 * Semantic validation: the shape alone is not enough. `2026-13-99` matches the regex but
 * is not a real date, so we round-trip through UTC and compare.
 */
export function isIsoDate(value: string | null | undefined): value is IsoDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today according to the device's local clock. */
export function todayIso(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Wall-clock parts of an instant in a given IANA timezone. Falls back to UTC if the
 * runtime lacks timezone data, so a missing tz database never crashes the app.
 */
export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(instant);
    const read = (type: Intl.DateTimeFormatPartTypes): number => {
      const match = parts.find((part) => part.type === type);
      return match ? Number(match.value) : 0;
    };
    return {
      year: read('year'),
      month: read('month'),
      day: read('day'),
      hour: read('hour'),
      minute: read('minute'),
      second: read('second'),
    };
  } catch {
    return {
      year: instant.getUTCFullYear(),
      month: instant.getUTCMonth() + 1,
      day: instant.getUTCDate(),
      hour: instant.getUTCHours(),
      minute: instant.getUTCMinutes(),
      second: instant.getUTCSeconds(),
    };
  }
}

/**
 * Today according to the *property* timezone. Search defaults and minimum selectable
 * dates must respect the property's calendar, not the traveller's device.
 */
export function todayIsoInTimeZone(timeZone: string, now: Date = new Date()): IsoDate {
  const parts = getZonedParts(now, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
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
