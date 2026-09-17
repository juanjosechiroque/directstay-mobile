import type { User } from '@supabase/supabase-js';

/** Minimal authenticated identity. Never carries PII beyond what Auth itself returns. */
export interface AuthUser {
  id: string;
  email: string;
}

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export interface SignUpResult {
  user: AuthUser | null;
  /** True when Supabase requires email confirmation before a session exists. */
  needsEmailConfirmation: boolean;
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) {
    return null;
  }
  return { id: user.id, email: user.email ?? '' };
}
