import { formatMinorUnits, formatMinorUnitsCompact, toMajorUnits } from '../money';

describe('money formatters', () => {
  it('formats USD minor units in Spanish', () => {
    expect(formatMinorUnits(12000, 'USD', 'es')).toBe('$ 120,00');
  });

  it('formats USD minor units in English', () => {
    expect(formatMinorUnits(12000, 'USD', 'en')).toBe('$120.00');
  });

  it('groups thousands with the locale separator', () => {
    expect(formatMinorUnits(123456, 'USD', 'en')).toBe('$1,234.56');
    expect(formatMinorUnits(123456, 'USD', 'es')).toBe('$ 1.234,56');
  });

  it('never uses floating point for the integer/fraction split', () => {
    expect(toMajorUnits(100)).toBe('1.00');
    expect(toMajorUnits(199)).toBe('1.99');
    expect(toMajorUnits(5)).toBe('0.05');
  });

  it('handles zero', () => {
    expect(formatMinorUnits(0, 'USD', 'en')).toBe('$0.00');
  });

  it('falls back to the currency code when the symbol is unknown', () => {
    expect(formatMinorUnits(5000, 'CAD', 'en')).toBe('CAD 50.00');
  });

  it('drops decimals in the compact form', () => {
    expect(formatMinorUnitsCompact(12000, 'USD', 'es')).toBe('$ 120');
    expect(formatMinorUnitsCompact(12000, 'USD', 'en')).toBe('$120');
  });
});
