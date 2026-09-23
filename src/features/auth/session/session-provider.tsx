import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getSessionUser } from '@/features/auth/auth-service';
import { clearUserScopedQueries } from '@/features/auth/queries/invalidation';
import { toAuthUser, type AuthUser, type SessionStatus } from '@/features/auth/types';
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

    void getSessionUser(client).then((nextUser) => {
      if (!active) {
        return;
      }
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
    });

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
