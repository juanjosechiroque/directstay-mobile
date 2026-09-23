/**
 * Supabase environment configuration for the Expo client.
 *
 * Only `EXPO_PUBLIC_*` variables are inlined into the bundle, and they are public by
 * design: the Supabase anon key is protected by RLS, never by secrecy. Service-role and
 * Stripe secret keys must never use this prefix.
 *
 * The organization slug selects which brand/organization this deployment serves. The
 * app never hardcodes the demo business into domain logic.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  organizationSlug: string;
}

export class AppConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Missing or invalid environment configuration: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and set the EXPO_PUBLIC_* values (see README).',
    );
    this.name = 'AppConfigError';
    this.missing = missing;
  }
}

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Reads and validates the public configuration. Validation runs at client creation, so a
 * misconfigured deployment fails immediately with an actionable message instead of an
 * opaque network error later.
 */
export function resolveSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig {
  const missing: string[] = [];

  const url = readEnv(env.EXPO_PUBLIC_SUPABASE_URL);
  const anonKey = readEnv(env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const organizationSlug = readEnv(env.EXPO_PUBLIC_ORGANIZATION_SLUG);

  if (!url || !/^https?:\/\//.test(url)) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!anonKey) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!organizationSlug) {
    missing.push('EXPO_PUBLIC_ORGANIZATION_SLUG');
  }

  if (missing.length > 0) {
    throw new AppConfigError(missing);
  }

  return {
    url: url as string,
    anonKey: anonKey as string,
    organizationSlug: organizationSlug as string,
  };
}

let cachedConfig: SupabaseConfig | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  if (!cachedConfig) {
    cachedConfig = resolveSupabaseConfig();
  }
  return cachedConfig;
}
