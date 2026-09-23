import { addDays, diffInNights, isIsoDate, todayIso, todayIsoInTimeZone } from '../index';

describe('business date helpers', () => {
  it('counts nights over the [checkIn, checkOut) interval', () => {
    expect(diffInNights('2026-09-10', '2026-09-12')).toBe(2);
    expect(diffInNights('2026-09-10', '2026-09-11')).toBe(1);
    expect(diffInNights('2026-09-10', '2026-09-10')).toBe(0);
  });

  it('adds days without timezone drift', () => {
    expect(addDays('2026-09-10', 3)).toBe('2026-09-13');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('validates ISO business dates', () => {
    expect(isIsoDate('2026-09-10')).toBe(true);
    expect(isIsoDate('10/09/2026')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it('rejects impossible dates, not just malformed ones', () => {
    expect(isIsoDate('2026-13-99')).toBe(false);
    expect(isIsoDate('2026-00-10')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-04-31')).toBe(false);
    expect(isIsoDate('2026-09-31')).toBe(false);
    // Leap years are handled correctly.
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
  });

  it('returns today in ISO format', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('computes today in the property timezone, not the device timezone', () => {
    // 02:00 UTC is still the previous day in Lima (UTC-5) and the same day in Tokyo.
    const instant = new Date('2026-09-15T02:00:00Z');
    expect(todayIsoInTimeZone('America/Lima', instant)).toBe('2026-09-14');
    expect(todayIsoInTimeZone('UTC', instant)).toBe('2026-09-15');
    expect(todayIsoInTimeZone('Asia/Tokyo', instant)).toBe('2026-09-15');
  });
});
