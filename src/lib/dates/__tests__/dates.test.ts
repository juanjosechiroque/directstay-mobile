import { addDays, diffInNights, isIsoDate, rangesOverlap, todayIso } from '../index';

describe('business date helpers', () => {
  it('counts nights over the [checkIn, checkOut) interval', () => {
    expect(diffInNights('2026-09-10', '2026-09-12')).toBe(2);
    expect(diffInNights('2026-09-10', '2026-09-11')).toBe(1);
    expect(diffInNights('2026-09-10', '2026-09-10')).toBe(0);
  });

  it('allows same-day turnover between consecutive bookings', () => {
    expect(rangesOverlap('2026-09-10', '2026-09-12', '2026-09-12', '2026-09-14')).toBe(false);
  });

  it('detects an overlap in the half-open interval', () => {
    expect(rangesOverlap('2026-09-10', '2026-09-12', '2026-09-11', '2026-09-13')).toBe(true);
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

  it('returns today in ISO format', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
