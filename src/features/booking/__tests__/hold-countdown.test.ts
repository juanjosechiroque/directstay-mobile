import { formatHoldCountdown, remainingHoldSeconds } from '@/features/booking/hold-countdown';

describe('booking hold countdown', () => {
  const deadline = '2028-04-01T12:05:00.000Z';
  it('uses the absolute deadline after resuming', () => {
    expect(remainingHoldSeconds(deadline, Date.parse('2028-04-01T12:00:00.000Z'))).toBe(300);
    expect(remainingHoldSeconds(deadline, Date.parse('2028-04-01T12:04:59.100Z'))).toBe(1);
  });
  it('never reports negative time', () => {
    expect(remainingHoldSeconds(deadline, Date.parse('2028-04-01T12:06:00.000Z'))).toBe(0);
  });
  it('formats minutes and seconds', () => {
    expect(formatHoldCountdown(300)).toBe('05:00');
    expect(formatHoldCountdown(9)).toBe('00:09');
  });
});
