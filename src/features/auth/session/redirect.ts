/**
 * Safe post-auth redirect handling.
 *
 * The `redirect` value travels through the login screen as a route param. It must be an
 * internal path only: never an external URL and never anything that could carry PII
 * (emails, names, tokens are rejected). Anything suspicious falls back to the home route.
 */
export const DEFAULT_AUTH_REDIRECT = '/';

const SENSITIVE_PATTERN = /(token|password|secret|email|phone|@)/i;

export function sanitizeRedirect(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') {
    return DEFAULT_AUTH_REDIRECT;
  }
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return DEFAULT_AUTH_REDIRECT;
  }
  if (
    candidate.includes('://') ||
    candidate.includes('@') ||
    candidate.includes('\\') ||
    SENSITIVE_PATTERN.test(candidate)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }
  return candidate;
}
