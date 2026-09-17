import { signIn } from '@/features/auth/auth-service';
import type { DatabaseClient } from '@/lib/supabase/client';

function clientWithAuth(auth: Record<string, unknown>): DatabaseClient {
  return { auth } as unknown as DatabaseClient;
}

describe('auth service', () => {
  it('returns the authenticated user on success', async () => {
    const client = clientWithAuth({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'u-1', email: 'guest@example.test' } },
        error: null,
      }),
    });

    await expect(
      signIn(client, { email: 'guest@example.test', password: 'secret1' }),
    ).resolves.toEqual({ id: 'u-1', email: 'guest@example.test' });
  });

  it('maps invalid credentials to a safe translated code', async () => {
    const client = clientWithAuth({
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: { code: 'invalid_credentials' } }),
    });

    await expect(
      signIn(client, { email: 'guest@example.test', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'error.authInvalidCredentials' });
  });
});
