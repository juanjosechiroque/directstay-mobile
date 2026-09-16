import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig, type SupabaseConfig } from '@/lib/supabase/config';

/**
 * Supabase client for React Native.
 *
 * `@supabase/supabase-js` needs a Web URL implementation; `react-native-url-polyfill/auto`
 * provides it. Session persistence uses AsyncStorage (React Native has no `localStorage`),
 * and `detectSessionInUrl` is off because deep links are handled explicitly by the auth
 * feature. The anon key is public by design: RLS is the security boundary.
 */
export type DatabaseClient = SupabaseClient;

export function createSupabaseClient(config: SupabaseConfig = getSupabaseConfig()): DatabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

let cachedClient: DatabaseClient | null = null;

/** Lazy singleton so importing this module never fails for modules that do not use it. */
export function getSupabaseClient(): DatabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient();
  }
  return cachedClient;
}
