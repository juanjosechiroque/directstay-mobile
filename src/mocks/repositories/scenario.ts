import { AppError } from '@/lib/errors';

/**
 * Mock scenario controller.
 *
 * Every mock repository reads this singleton so reviewers can exercise the same screens
 * in success, loading (slow), empty and error states without network access. It is a
 * development/demo affordance only; it disappears with the mock bundle.
 */
export type MockScenario = 'success' | 'slow' | 'empty' | 'error';

let currentScenario: MockScenario = 'success';
let latencyEnabled = true;
const listeners = new Set<() => void>();

export function getMockScenario(): MockScenario {
  return currentScenario;
}

export function setMockScenario(next: MockScenario): void {
  currentScenario = next;
  listeners.forEach((listener) => listener());
}

export function subscribeMockScenario(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isEmptyScenario(): boolean {
  return currentScenario === 'empty';
}

export function assertMockSuccess(): void {
  if (currentScenario === 'error') {
    throw new AppError('error.generic');
  }
}

/** Allows tests to keep the mock contract without paying the simulated latency. */
export function setMockLatencyEnabled(enabled: boolean): void {
  latencyEnabled = enabled;
}

/** Short simulated latency; the `slow` scenario keeps loading states visible. */
export async function simulateLatency(): Promise<void> {
  if (!latencyEnabled) {
    return;
  }
  const [min, max] = currentScenario === 'slow' ? [1600, 2400] : [220, 620];
  const duration = Math.round(min + Math.random() * (max - min));
  await new Promise((resolve) => setTimeout(resolve, duration));
}
