import { AppError } from '@/lib/errors';

import { toAppError } from '../errors';

describe('toAppError', () => {
  it.each([
    ['23P01', 'error.unavailable'],
    ['22007', 'error.validation'],
    ['22023', 'error.validation'],
    ['28000', 'error.sessionRequired'],
    ['P0002', 'error.notFound'],
    ['PGRST116', 'error.notFound'],
    ['42501', 'error.sessionRequired'],
  ])('maps Supabase code %s to %s', (code, expected) => {
    expect(toAppError({ code, message: 'database failure' }).code).toBe(expected);
  });

  it('maps known message markers', () => {
    expect(toAppError({ message: 'unit_unavailable' }).code).toBe('error.unavailable');
    expect(toAppError({ message: 'not_authenticated' }).code).toBe('error.sessionRequired');
  });

  it('uses the generic code for an unknown failure and preserves AppError instances', () => {
    const cause = { code: 'unknown', message: 'failure' };
    expect(toAppError(cause)).toMatchObject({ code: 'error.generic', cause });

    const appError = new AppError('error.validation');
    expect(toAppError(appError)).toBe(appError);
  });
});
