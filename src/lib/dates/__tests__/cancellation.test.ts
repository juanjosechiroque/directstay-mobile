import { formatCancellationDeadline, isCancellationEligible } from '../cancellation';

/**
 * A confirmed booking can be canceled until exactly 24 hours before local check-in.
 * Example: America/Lima (UTC-5), check-in 15:00.
 * Check-in 2026-09-14 15:00 Lima ⇒ deadline 2026-09-13 15:00 Lima = 2026-09-13T20:00Z.
 */
const base = {
  checkIn: '2026-09-14',
  checkInTime: '15:00',
  timeZone: 'America/Lima',
};

describe('cancellation eligibility', () => {
  it('is eligible well before the deadline', () => {
    expect(isCancellationEligible({ ...base, now: new Date('2026-09-10T00:00:00Z') })).toBe(true);
  });

  it('is eligible one second before the deadline', () => {
    expect(isCancellationEligible({ ...base, now: new Date('2026-09-13T19:59:59Z') })).toBe(true);
  });

  it('is still eligible exactly at the deadline', () => {
    expect(isCancellationEligible({ ...base, now: new Date('2026-09-13T20:00:00Z') })).toBe(true);
  });

  it('is ineligible inside the final 24 hours', () => {
    expect(isCancellationEligible({ ...base, now: new Date('2026-09-13T20:00:01Z') })).toBe(false);
  });

  it('is not eligible once the check-in passed', () => {
    expect(isCancellationEligible({ ...base, now: new Date('2026-09-14T18:00:00Z') })).toBe(false);
  });

  it('evaluates the deadline against the property timezone, not the device one', () => {
    // 2026-09-13T21:00Z is 16:00 in Lima (past the 15:00 deadline) but 13:00 in Anchorage.
    const instant = new Date('2026-09-13T21:00:00Z');
    expect(isCancellationEligible({ ...base, timeZone: 'America/Lima', now: instant })).toBe(false);
    expect(isCancellationEligible({ ...base, timeZone: 'America/Anchorage', now: instant })).toBe(
      true,
    );
  });
});

describe('cancellation deadline formatting', () => {
  it('renders the day before check-in', () => {
    expect(formatCancellationDeadline('2026-09-14', '15:00', 'es')).toContain('13');
  });
});
