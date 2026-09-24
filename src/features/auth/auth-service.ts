import { toAuthUser, type AuthUser } from '@/features/auth/types';
import { AppError } from '@/lib/errors';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAuthError } from '@/lib/supabase/errors';

/**
 * Auth use-cases over Supabase Auth.
 *
 * The service is a thin, testable wrapper: screens never call the Supabase client
 * directly, and every failure is translated to a safe `AppError` code. Email confirmation
 * is a Supabase project setting, not a client branch: in development/preview it can be
 * disabled for convenience, while production requires it.
 */

export async function getSessionUser(client: DatabaseClient): Promise<AuthUser | null> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    // "No session" and "could not read the session" are different outcomes. A transient
    // network/AsyncStorage failure must not be reported as a signed-out guest, so it is
    // surfaced as a typed error for the caller to retry instead of silently ending the session.
    throw toAuthError(error);
  }
  return toAuthUser(data.session?.user ?? null);
}

export async function ensureGuestSession(client: DatabaseClient): Promise<AuthUser> {
  const { data: current, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw toAuthError(sessionError);
  }
  const existing = toAuthUser(current.session?.user ?? null);
  if (existing) {
    return existing;
  }

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    throw toAuthError(error);
  }
  const user = toAuthUser(data.user);
  if (!user) {
    throw new AppError('error.authFailed');
  }
  return user;
}
