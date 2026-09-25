import { useEffect } from 'react';

/**
 * Stand-in for `expo-router` in component tests:
 *   jest.mock('expo-router', () => jest.requireActual('@/test/router-mock'));
 * Tests assert on `router` calls and set route params with `setParams`.
 */
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

let params: Record<string, string | undefined> = {};

export function setParams(next: Record<string, string | undefined>): void {
  params = next;
}

export function resetRouter(): void {
  params = {};
  for (const fn of Object.values(router)) fn.mockClear();
  router.canGoBack.mockReturnValue(true);
}

export const useRouter = () => router;
export const useLocalSearchParams = () => params;
export const useFocusEffect = (effect: () => void | (() => void)) => {
  useEffect(effect, [effect]);
};
