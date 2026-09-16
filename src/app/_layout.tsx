import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query-client';
import { RepositoryProvider } from '@/lib/repositories';
import { colors } from '@/lib/theme';
import { mockRepositories } from '@/mocks/repositories';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repositories={mockRepositories}>
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
    </QueryClientProvider>
  );
}
