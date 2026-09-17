import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/queries/use-session';
import type { SessionStatus } from '@/features/auth/types';

/**
 * Navigation guard for identity-scoped screens.
 *
 * The catalog and availability stay public; profile, bookings and stay are protected here
 * rather than by hidden buttons, so a deep link cannot reach them. While the guard is
 * loading or redirecting, the caller renders a loading state — never private content.
 */
export function useSessionGuard(redirectPath: string): SessionStatus {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedOut') {
      router.replace({ pathname: '/login', params: { redirect: redirectPath } });
    }
  }, [status, router, redirectPath]);

  return status;
}
