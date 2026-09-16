import { addDays, parseIsoDate, type IsoDate } from '@/lib/dates';

/**
 * Cancellation eligibility (frozen domain rule).
 *
 * A `CONFIRMED` booking can be canceled in-app until exactly 24 hours before the
 * property-local check-in time (property check-in 15:00 America/Lima ⇒ deadline for a
 * Sep 14 check-in is Sep 13 15:00). Inside that window only property contact is offered.
 *
 * This helper is pure and timezone-aware: it converts "now" into the property's wall
 * clock before comparing, so it works regardless of the device timezone.
 */

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

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

export interface CancellationEligibilityInput {
  checkIn: IsoDate;
  checkInTime: string;
  timeZone: string;
  now?: Date;
}

const MS_PER_HOUR = 60 * 60 * 1000;
export const CANCELLATION_WINDOW_HOURS = 24;

export function isCancellationEligible({
  checkIn,
  checkInTime,
  timeZone,
  now = new Date(),
}: CancellationEligibilityInput): boolean {
  const nowParts = getZonedParts(now, timeZone);
  const nowLocalMs = Date.UTC(
    nowParts.year,
    nowParts.month - 1,
    nowParts.day,
    nowParts.hour,
    nowParts.minute,
    nowParts.second,
  );

  const [year, month, day] = checkIn.split('-').map(Number);
  const [hour, minute] = checkInTime.split(':').map(Number);
  const checkInLocalMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  const deadlineMs = checkInLocalMs - CANCELLATION_WINDOW_HOURS * MS_PER_HOUR;
  return nowLocalMs <= deadlineMs;
}

/** Human-readable deadline as a wall clock string, independent of the device timezone. */
export function formatCancellationDeadline(
  checkIn: IsoDate,
  checkInTime: string,
  locale: string,
): string {
  const [hour, minute] = checkInTime.split(':').map(Number);
  const wallClock = parseIsoDate(addDays(checkIn, -1));
  wallClock.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
  return new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-US' : 'es-PE', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(wallClock);
}
