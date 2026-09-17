import { DEFAULT_AUTH_REDIRECT, sanitizeRedirect } from '@/features/auth/session/redirect';

describe('post-auth redirect sanitization', () => {
  it('keeps internal paths', () => {
    expect(sanitizeRedirect('/bookings')).toBe('/bookings');
    expect(sanitizeRedirect('/units/3333?checkIn=2026-10-10')).toBe(
      '/units/3333?checkIn=2026-10-10',
    );
  });

  it('falls back for external URLs', () => {
    expect(sanitizeRedirect('https://evil.example/phish')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeRedirect('//evil.example')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('never allows PII or tokens in the redirect target', () => {
    expect(sanitizeRedirect('/bookings?email=guest@example.test')).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeRedirect('/stay/1?access_token=secret')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('falls back for missing or array values', () => {
    expect(sanitizeRedirect(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeRedirect(['/bookings', '/profile'])).toBe('/bookings');
  });
});
