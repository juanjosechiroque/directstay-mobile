import { AppError, type AppErrorCode } from '@/lib/errors';

/**
 * Maps Supabase/PostgREST failures to application error codes.
 *
 * The error message may contain internal details (constraint names, RLS context); the UI
 * only ever sees the translated `AppErrorCode`. The original error is preserved as
 * `cause` for logging/debugging.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const source = error as { code?: string; message?: string } | null;
  const code = source?.code ?? '';
  const message = source?.message ?? '';

  const mapped: AppErrorCode | null =
    code === '23P01' || message.includes('unit_unavailable')
      ? 'error.unavailable'
      : code === '22007' || code === '22023'
        ? 'error.validation'
        : code === '28000' || message.includes('not_authenticated')
          ? 'error.sessionRequired'
          : code === 'P0002' || code === 'PGRST116'
            ? 'error.notFound'
            : code === '42501'
              ? 'error.sessionRequired'
              : null;

  return new AppError(mapped ?? 'error.generic', { cause: error });
}

/** Maps Supabase Auth failures to distinct, translated codes. */
export function toAuthError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const source = error as { code?: string; message?: string; status?: number } | null;
  const code = source?.code ?? '';
  const message = (source?.message ?? '').toLowerCase();
  const status = source?.status;

  let mapped: AppErrorCode = 'error.authFailed';
  if (code === 'invalid_credentials' || message.includes('invalid login')) {
    mapped = 'error.authInvalidCredentials';
  } else if (code === 'user_already_exists' || message.includes('already registered')) {
    mapped = 'error.authEmailInUse';
  } else if (code === 'email_not_confirmed' || message.includes('not confirmed')) {
    mapped = 'error.authEmailNotConfirmed';
  } else if (
    code === 'weak_password' ||
    message.includes('weak password') ||
    message.includes('at least 6 characters')
  ) {
    mapped = 'error.authWeakPassword';
  } else if (status === 0 || message.includes('network')) {
    mapped = 'error.generic';
  }

  return new AppError(mapped, { cause: error });
}
