import { ensureGuestSession } from '@/features/auth/auth-service';
import type { DatabaseClient } from '@/lib/supabase/client';

function clientWithAuth(auth: Record<string, unknown>): DatabaseClient {
  return { auth } as unknown as DatabaseClient;
}

describe('ensureGuestSession', () => {
  it('reuses an existing session without creating another identity', async () => {
    const signInAnonymously = jest.fn();
    const client = clientWithAuth({
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'u-1', is_anonymous: true } } },
        error: null,
      }),
      signInAnonymously,
    });

    await expect(ensureGuestSession(client)).resolves.toEqual({ id: 'u-1', isAnonymous: true });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('creates an anonymous session when none exists', async () => {
    const client = clientWithAuth({
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInAnonymously: jest.fn().mockResolvedValue({
        data: { user: { id: 'u-2', is_anonymous: true } },
        error: null,
      }),
    });

    await expect(ensureGuestSession(client)).resolves.toEqual({ id: 'u-2', isAnonymous: true });
  });

  it('translates anonymous sign-in failures', async () => {
    const client = clientWithAuth({
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInAnonymously: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { code: 'unexpected_failure' },
      }),
    });

    await expect(ensureGuestSession(client)).rejects.toMatchObject({ code: 'error.authFailed' });
  });

  it('translates the anonymous-user request limit', async () => {
    const client = clientWithAuth({
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInAnonymously: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { code: 'over_request_rate_limit', status: 429 },
      }),
    });

    await expect(ensureGuestSession(client)).rejects.toMatchObject({
      code: 'error.authRateLimited',
    });
  });
});
