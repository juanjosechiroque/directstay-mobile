/**
 * Application-level error with an i18n key as its message.
 *
 * UI code translates `error.code` directly, so repository failures never carry
 * hardcoded copy. Mock repositories and the Supabase adapters map their failures
 * (Postgres error codes, RLS denials, auth errors) to these codes.
 */
export type AppErrorCode =
  | 'error.notFound'
  | 'error.unavailable'
  | 'error.validation'
  | 'error.sessionRequired'
  | 'error.authRateLimited'
  | 'error.authFailed'
  | 'error.configuration'
  | 'error.generic';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, options?: { cause?: unknown }) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorCode(error: unknown): AppErrorCode {
  if (isAppError(error)) {
    return error.code;
  }
  return 'error.generic';
}
