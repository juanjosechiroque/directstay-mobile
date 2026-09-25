import { AppError, type AppErrorCode } from '@/lib/errors';

const APP_ERROR_CODE_BY_SUPABASE_CODE: Readonly<Record<string, AppErrorCode>> = {
  '23P01': 'error.unavailable',
  '22007': 'error.validation',
  '22023': 'error.validation',
  '28000': 'error.sessionRequired',
  P0002: 'error.notFound',
  PGRST116: 'error.notFound',
  '42501': 'error.sessionRequired',
};

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

  if (message.includes('unit_unavailable')) {
    return new AppError('error.unavailable', { cause: error });
  }
  if (message.includes('hold_expired')) {
    return new AppError('error.holdExpired', { cause: error });
  }
  if (message.includes('organization_not_bookable') || message.includes('unit_not_bookable')) {
    return new AppError('error.notFound', { cause: error });
  }

  const mapped = APP_ERROR_CODE_BY_SUPABASE_CODE[code];
  if (mapped) {
    return new AppError(mapped, { cause: error });
  }

  if (message.includes('not_authenticated')) {
    return new AppError('error.sessionRequired', { cause: error });
  }

  return new AppError('error.generic', { cause: error });
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
  if (status === 429 || code === 'over_request_rate_limit' || code === 'too_many_requests') {
    mapped = 'error.authRateLimited';
  } else if (status === 0 || message.includes('network')) {
    mapped = 'error.generic';
  }

  return new AppError(mapped, { cause: error });
}
