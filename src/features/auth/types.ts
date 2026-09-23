import type { User } from '@supabase/supabase-js';

/** Minimal authenticated identity. Never carries PII beyond what Auth itself returns. */
export interface AuthUser {
  id: string;
  email?: string;
  isAnonymous: boolean;
}

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    ...(user.email ? { email: user.email } : {}),
    isAnonymous: Boolean(user.is_anonymous),
  };
}
