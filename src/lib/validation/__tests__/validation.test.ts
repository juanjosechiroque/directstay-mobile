import { hasErrors, toIsoDateParam, validateGuestForm, validateSearchCriteria } from '../index';

describe('search criteria validation', () => {
  const base = { checkIn: '2026-09-10', checkOut: '2026-09-12', guests: 2, maxGuests: 4 };

  it('accepts a valid range', () => {
    expect(validateSearchCriteria(base)).toEqual({});
  });

  it('requires both dates', () => {
    const errors = validateSearchCriteria({ ...base, checkIn: null, checkOut: null });
    expect(errors.checkIn).toBe('validation.checkInRequired');
    expect(errors.checkOut).toBe('validation.checkOutRequired');
  });

  it('rejects a check-out on or before check-in', () => {
    expect(validateSearchCriteria({ ...base, checkOut: '2026-09-10' }).checkOut).toBe(
      'validation.checkOutAfterCheckIn',
    );
    expect(validateSearchCriteria({ ...base, checkOut: '2026-09-09' }).checkOut).toBe(
      'validation.checkOutAfterCheckIn',
    );
  });

  it('rejects invalid guest counts', () => {
    expect(validateSearchCriteria({ ...base, guests: 0 }).guests).toBe('validation.guestsRequired');
    expect(validateSearchCriteria({ ...base, guests: 5 }).guests).toBe('validation.guestsTooMany');
  });

  it('skips the capacity check when maxGuests is omitted', () => {
    expect(
      validateSearchCriteria({ checkIn: base.checkIn, checkOut: base.checkOut, guests: 9 }),
    ).toEqual({});
  });
});

describe('guest form validation', () => {
  const valid = {
    fullName: 'Valeria Quispe',
    email: 'valeria@example.com',
    phone: '+51 999 000 111',
  };

  it('accepts a valid guest', () => {
    expect(validateGuestForm(valid)).toEqual({});
  });

  it('allows an empty phone', () => {
    expect(validateGuestForm({ ...valid, phone: '' })).toEqual({});
  });

  it('requires a name and an email', () => {
    const errors = validateGuestForm({ fullName: '', email: '', phone: '' });
    expect(errors.fullName).toBe('validation.nameRequired');
    expect(errors.email).toBe('validation.emailRequired');
  });

  it('rejects malformed emails and phones', () => {
    expect(validateGuestForm({ ...valid, email: 'not-an-email' }).email).toBe(
      'validation.emailInvalid',
    );
    expect(validateGuestForm({ ...valid, phone: 'abc' }).phone).toBe('validation.phoneInvalid');
  });

  it('detects when errors exist', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'validation.emailInvalid' })).toBe(true);
  });
});

describe('route date params', () => {
  it('accepts a real business date', () => {
    expect(toIsoDateParam('2026-09-10')).toBe('2026-09-10');
  });

  it('rejects impossible dates instead of passing them through', () => {
    expect(toIsoDateParam('2026-13-99')).toBeNull();
    expect(toIsoDateParam('2026-02-30')).toBeNull();
    expect(toIsoDateParam('not-a-date')).toBeNull();
    expect(toIsoDateParam(undefined)).toBeNull();
    expect(toIsoDateParam(['2026-09-10', '2026-09-11'])).toBeNull();
  });
});
