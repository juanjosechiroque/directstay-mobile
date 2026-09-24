import '@/i18n';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { EmptyState, Screen } from '@/components';
import { SessionProvider } from '@/features/auth/session/session-provider';
import { getAppBootstrap } from '@/lib/bootstrap';
import { queryClient } from '@/lib/query-client';
import { RepositoryProvider } from '@/lib/repositories';
import * as Sentry from '@sentry/react-native';

import { initializeSentry } from '@/lib/telemetry';
import { colors } from '@/lib/theme';

initializeSentry();

// Composed once, outside React render: the Supabase client/repositories are a module-level
// lazy singleton, so re-renders and StrictMode cannot create a second client.
const bootstrap = getAppBootstrap();

/**
 * Root composition.
 *
 * Order matters: TanStack Query wraps the session (so session changes can clear caches),
 * the session wraps the repository provider, and both share one Supabase client. A missing
 * environment configuration fails here with a clear screen instead of an opaque error.
 */
function RootLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    SplashScreen.hideAsync();
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

export default Sentry.wrap(RootLayout);
