import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { BOOKING_STATUSES, CANCELLATION_REASONS } from '@/features/booking/types';
import { AMENITY_CODES, HIGHLIGHT_CODES } from '@/features/property/types';

import en from '../locales/en.json';
import es from '../locales/es.json';

function collectKeys(value: unknown, prefix = '', keys: string[] = []): string[] {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectKeys(child, prefix ? `${prefix}.${key}` : key, keys);
    }
  } else if (prefix) {
    keys.push(prefix);
  }
  return keys;
}

function getByPath(source: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

describe('locale files', () => {
  it('es.json and en.json expose the exact same keys', () => {
    expect(sortUnique(collectKeys(es))).toEqual(sortUnique(collectKeys(en)));
  });

  it('does not contain empty or whitespace-only translations', () => {
    for (const resource of [es, en]) {
      for (const key of collectKeys(resource)) {
        const value = getByPath(resource as Record<string, unknown>, key);
        expect(typeof value).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('has no unused translation keys', () => {
    function sourceFiles(directory: string): string[] {
      return readdirSync(directory).flatMap((entry) => {
        if (entry === '__tests__' || entry === 'locales') return [];
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry) ? [path] : [];
      });
    }
    const source = sourceFiles(join(process.cwd(), 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const dynamicKeys = [
      ...AMENITY_CODES.map((code) => `amenities.${code}`),
      ...HIGHLIGHT_CODES.map((code) => `highlights.${code}`),
      ...BOOKING_STATUSES.map((status) => `booking.status.${status}`),
      ...CANCELLATION_REASONS.map((reason) => `booking.cancellationReason.${reason}`),
    ];
    for (const key of collectKeys(es)) {
      const base = key.replace(/_(one|other)$/, '');
      expect(source.includes(base) || dynamicKeys.includes(key)).toBe(true);
    }
  });
});
