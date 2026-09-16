import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EmptyState, Screen } from '@/components';
import { SessionProvider } from '@/features/auth/session/session-provider';
import { queryClient } from '@/lib/query-client';
import { RepositoryProvider } from '@/lib/repositories';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { createSupabaseRepositories } from '@/lib/supabase/repositories';
import { colors } from '@/lib/theme';

/**
 * Root composition.
 *
 * Order matters: TanStack Query wraps the session (so session changes can clear caches),
 * the session wraps the repository provider, and both share one Supabase client. A missing
 * environment configuration fails here with a clear screen instead of an opaque error.
 */
export default function RootLayout() {
  const { t } = useTranslation();
  const bootstrap = useMemo(() => {
    try {
      const config = getSupabaseConfig();
      const client = getSupabaseClient();
      return {
        ok: true as const,
        client,
        repositories: createSupabaseRepositories(client, config.organizationSlug),
      };
    } catch (error) {
      return { ok: false as const, error };
    }
  }, []);

  if (!bootstrap.ok) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Screen>
          <EmptyState
            title={t('error.configuration')}
            message={bootstrap.error instanceof Error ? bootstrap.error.message : undefined}
          />
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider client={bootstrap.client}>
        <RepositoryProvider repositories={bootstrap.repositories}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </SafeAreaProvider>
        </RepositoryProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
