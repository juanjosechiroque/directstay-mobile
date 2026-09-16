/**
 * Application-level error with an i18n key as its message.
 *
 * UI code translates `error.code` directly, so repository failures never carry
 * hardcoded copy. Mock repositories throw this today; a Supabase adapter maps Postgres
 * error codes (`23P01`, RLS denials, RPC errors) to the same codes later.
 */
export type AppErrorCode =
  | 'error.notFound'
  | 'error.unavailable'
  | 'error.cancelNotAllowed'
  | 'error.validation'
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
