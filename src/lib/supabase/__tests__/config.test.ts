import { AppConfigError, resolveSupabaseConfig } from '@/lib/supabase/config';

describe('supabase config', () => {
  it('resolves a complete environment', () => {
    const config = resolveSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      EXPO_PUBLIC_ORGANIZATION_SLUG: 'ayni-hospitality',
      EXPO_PUBLIC_APP_ENV: 'local',
    } as unknown as NodeJS.ProcessEnv);

    expect(config).toEqual({
      appEnv: 'local',
      url: 'http://127.0.0.1:55321',
      anonKey: 'anon-key',
      organizationSlug: 'ayni-hospitality',
    });
  });

  it('defaults an unknown app env to local', () => {
    const config = resolveSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'key',
      EXPO_PUBLIC_ORGANIZATION_SLUG: 'slug',
      EXPO_PUBLIC_APP_ENV: 'staging',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.appEnv).toBe('local');
  });

  it('reports every missing variable with a clear error', () => {
    expect(() => resolveSupabaseConfig({} as unknown as NodeJS.ProcessEnv)).toThrow(AppConfigError);
    try {
      resolveSupabaseConfig({} as unknown as NodeJS.ProcessEnv);
    } catch (error) {
      expect((error as AppConfigError).missing).toEqual([
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_ORGANIZATION_SLUG',
      ]);
    }
  });

  it('rejects a non-http URL', () => {
    expect(() =>
      resolveSupabaseConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'not-a-url',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'key',
        EXPO_PUBLIC_ORGANIZATION_SLUG: 'slug',
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(AppConfigError);
  });
});
