import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getSessionUser } from '@/features/auth/auth-service';
import { clearUserScopedQueries } from '@/features/auth/queries/invalidation';
import { toAuthUser, type AuthUser, type SessionStatus } from '@/features/auth/types';
import { reportOperationalError } from '@/lib/telemetry';
import type { DatabaseClient } from '@/lib/supabase/client';

/**
 * Session context.
 *
 * Owns the single source of truth for the current guest session by subscribing to Supabase Auth.
 * The `client` is injected (same instance as the repositories), which keeps the provider
 * testable with a fake client. A visitor remains signed out until booking details are submitted.
 */
export interface SessionValue {
  client: DatabaseClient;
  status: SessionStatus;
  user: AuthUser | null;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  client,
  children,
}: {
  client: DatabaseClient;
  children?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;

    // Restoring the persisted session can fail transiently (network, AsyncStorage). Retry
    // before deciding: a read failure must not look like "no session" and sign the guest out.
    const restoreSession = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const nextUser = await getSessionUser(client);
          if (!active) return;
          setUser(nextUser);
          setStatus(nextUser ? 'signedIn' : 'signedOut');
          return;
        } catch (error) {
          if (!active) return;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
            continue;
          }
          // Kept failing. The stored session is left untouched: the failure is reported to
          // telemetry, the UI falls back to signed-out so the app stays usable, and a later
          // auth event or the next launch can still restore the session.
          reportOperationalError(error, { operation: 'auth.restoreSession' });
          setStatus('signedOut');
        }
      }
    };
    void restoreSession();

    const { data } = client.auth.onAuthStateChange((event, session) => {
      const nextUser = toAuthUser(session?.user ?? null);
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        clearUserScopedQueries(queryClient);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  const value = useMemo<SessionValue>(() => ({ client, status, user }), [client, status, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return value;
}
