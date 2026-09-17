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
    return null;
  }
  return toAuthUser(data.session?.user ?? null);
}

export async function signIn(
  client: DatabaseClient,
  credentials: { email: string; password: string },
): Promise<AuthUser> {
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });
  if (error) {
    throw toAuthError(error);
  }
  const user = toAuthUser(data.user);
  if (!user) {
    throw new AppError('error.authFailed');
  }
  return user;
}

export async function signOut(client: DatabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) {
    throw toAuthError(error);
  }
}
