import type { Repositories } from '@/lib/repositories';
import { getSupabaseClient, type DatabaseClient } from '@/lib/supabase/client';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { createSupabaseRepositories } from '@/lib/supabase/repositories';

export type AppBootstrap =
  { ok: true; client: DatabaseClient; repositories: Repositories } | { ok: false; error: unknown };

let cached: AppBootstrap | null = null;

/**
 * Lazy, module-level composition root.
 *
 * Creating the Supabase client and repositories is a one-time side effect that must not run
 * inside React render (StrictMode/concurrent rendering may re-run render). It is memoized at
 * module scope, and configuration errors are captured so the root can still render an explicit
 * error screen instead of crashing at import time.
 */
export function getAppBootstrap(): AppBootstrap {
  if (cached) {
    return cached;
  }
  try {
    const config = getSupabaseConfig();
    const client = getSupabaseClient();
    cached = {
      ok: true,
      client,
      repositories: createSupabaseRepositories(client, config.organizationSlug),
    };
  } catch (error) {
    cached = { ok: false, error };
  }
  return cached;
}
