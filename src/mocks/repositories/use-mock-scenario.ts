import { useSyncExternalStore } from 'react';

import { getMockScenario, subscribeMockScenario, type MockScenario } from './scenario';

/**
 * Reads the active mock scenario in React and re-renders when it changes. Used by the
 * demo controls in the Profile screen.
 */
export function useMockScenario(): MockScenario {
  return useSyncExternalStore(subscribeMockScenario, getMockScenario, getMockScenario);
}
