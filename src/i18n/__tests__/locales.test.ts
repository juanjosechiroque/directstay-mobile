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
});
