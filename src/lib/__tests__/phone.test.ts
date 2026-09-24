import { buildInternationalPhone } from '../phone';

describe('buildInternationalPhone', () => {
  it('combines a selected code and local digits', () => {
    expect(buildInternationalPhone('51', '999 000 111')).toBe('+51999000111');
  });

  it('keeps an optional phone empty', () => {
    expect(buildInternationalPhone('51', '')).toBe('');
  });
});
