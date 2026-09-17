import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Runtime/test separation guard.
 *
 * Mocks are allowed only in unit tests for repositories/adapters. This static check fails
 * if any runtime module imports the mock bundle, so the app can never silently fall back
 * to fixture data. The composition root must use the Supabase adapters.
 */

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.expo') {
        continue;
      }
      walk(full, files);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const SRC = join(process.cwd(), 'src');

function runtimeModules(): string[] {
  return walk(SRC).filter(
    (file) =>
      !file.includes('__tests__') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.test.tsx') &&
      !file.includes(join('src', 'mocks')),
  );
}

describe('runtime mock isolation', () => {
  it('no runtime module imports the mock bundle', () => {
    const offenders = runtimeModules().filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /@\/mocks/.test(source) || /from '[^']*\/mocks\//.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it('the root composition uses the Supabase repository factory', () => {
    const layout = readFileSync(join(SRC, 'app', '_layout.tsx'), 'utf8');
    expect(layout).toMatch(/createSupabaseRepositories/);
    expect(layout).toMatch(/SessionProvider/);
    expect(layout).not.toMatch(/mockRepositories/);
  });

  it('the mock bundle lives under src/mocks and is only referenced by tests', () => {
    const index = readFileSync(join(SRC, 'mocks', 'repositories', 'index.ts'), 'utf8');
    expect(index).toMatch(/mockRepositories/);
  });
});
