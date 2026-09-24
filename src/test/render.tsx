import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import { createInstance } from 'i18next';
import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/features/auth/session/session-provider';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import { RepositoryProvider, type Repositories } from '@/lib/repositories';
import type { DatabaseClient } from '@/lib/supabase/client';

const NEVER = () => Promise.reject(new Error('Repository method not faked in this test'));

/** Repositories whose every method rejects unless the test overrides it. */
export function fakeRepositories(
  overrides: Partial<{ [K in keyof Repositories]: Partial<Repositories[K]> }> = {},
): Repositories {
  return {
    property: { getCatalog: NEVER, getUnit: NEVER, ...overrides.property },
    availability: { searchAvailableUnits: NEVER, ...overrides.availability },
    booking: {
      getQuote: NEVER,
      listBookings: NEVER,
      getBooking: NEVER,
      createBooking: NEVER,
      confirmDemoPayment: NEVER,
      ...overrides.booking,
    },
    stay: { getStay: NEVER, ...overrides.stay },
  };
}

/** Minimal Supabase client: only the auth calls SessionProvider makes. */
export function fakeSessionClient(signedIn: boolean): DatabaseClient {
  const session = signedIn ? { user: { id: 'guest-1', is_anonymous: true } } : null;
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signInAnonymously: () =>
        Promise.resolve({ data: { user: { id: 'guest-1', is_anonymous: true } }, error: null }),
    },
  } as unknown as DatabaseClient;
}

export function createTestI18n(lng: 'es' | 'en' = 'es') {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng,
    fallbackLng: 'es',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

interface ProviderOptions {
  repositories?: Repositories;
  signedIn?: boolean;
  locale?: 'es' | 'en';
  queryClient?: QueryClient;
}

/**
 * Renders a screen with a fresh QueryClient, Spanish i18n, injected fake repositories and a
 * fake guest session, so each test is isolated and never touches the network.
 */
export async function renderWithProviders(
  ui: ReactElement,
  {
    repositories,
    signedIn = true,
    locale = 'es',
    queryClient,
    ...options
  }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const client = queryClient ?? createTestQueryClient();
  const i18n = createTestI18n(locale);
  const sessionClient = fakeSessionClient(signedIn);
  const repos = repositories ?? fakeRepositories();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <QueryClientProvider client={client}>
          <I18nextProvider i18n={i18n}>
            <SessionProvider client={sessionClient}>
              <RepositoryProvider repositories={repos}>{children}</RepositoryProvider>
            </SessionProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const result = await render(ui, { wrapper: Wrapper, ...options });
  return { queryClient: client, i18n, ...result };
}
