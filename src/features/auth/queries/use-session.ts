import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { signIn as signInService, signOut as signOutService } from '@/features/auth/auth-service';
import { clearUserScopedQueries } from '@/features/auth/queries/invalidation';
import { useSession } from '@/features/auth/session/session-provider';
import type { AuthUser } from '@/features/auth/types';

export { useSession } from '@/features/auth/session/session-provider';

export interface AuthActions {
  signIn: (credentials: { email: string; password: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

/**
 * Binds the auth use-cases to the session's client and clears user-scoped caches on any
 * identity change. Components depend on this hook, not on `supabase-js` directly.
 */
export function useAuthActions(): AuthActions {
  const { client } = useSession();
  const queryClient = useQueryClient();

  const clear = useCallback(() => clearUserScopedQueries(queryClient), [queryClient]);

  const signIn = useCallback(
    async (credentials: { email: string; password: string }) => {
      const user = await signInService(client, credentials);
      clear();
      return user;
    },
    [client, clear],
  );

  const signOut = useCallback(async () => {
    await signOutService(client);
    clear();
  }, [client, clear]);

  return {
    signIn,
    signOut,
  };
}
