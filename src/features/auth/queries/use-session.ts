import { useCallback } from 'react';

import { ensureGuestSession as ensureGuestSessionService } from '@/features/auth/auth-service';
import { useSession } from '@/features/auth/session/session-provider';
import type { AuthUser } from '@/features/auth/types';

export { useSession } from '@/features/auth/session/session-provider';

export interface AuthActions {
  ensureGuestSession: () => Promise<AuthUser>;
}

/**
 * Binds the auth use-cases to the session's client and clears user-scoped caches on any
 * identity change. Components depend on this hook, not on `supabase-js` directly.
 */
export function useAuthActions(): AuthActions {
  const { client } = useSession();
  const ensureGuestSession = useCallback(() => ensureGuestSessionService(client), [client]);

  return {
    ensureGuestSession,
  };
}
