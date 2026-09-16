/**
 * Minimal Node ambient declarations.
 *
 * A couple of tests inspect source files with `node:fs`/`node:path`; the project does not
 * depend on `@types/node`, so these narrow signatures keep TypeScript strict without
 * adding a dependency. Only the members used by tests are declared.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: string): string;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
}
