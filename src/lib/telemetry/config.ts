import type { ErrorEvent } from '@sentry/core';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isAppError, type AppErrorCode } from '@/lib/errors';

export type SentryEnvironment = 'development' | 'preview' | 'production';

const UUID_LIKE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const LONG_NUMBER = /\d{6,}/g;

export function getSentryEnvironment(): SentryEnvironment {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile === 'production' || profile === 'preview') {
    return profile;
  }
  return 'development';
}

function readPublicDsn(): string | undefined {
  return process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
}

function sanitizeUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  try {
    const url = new URL(raw);
    const path = url.pathname.replace(UUID_LIKE, ':id').replace(LONG_NUMBER, ':num');
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return raw.replace(UUID_LIKE, ':id').replace(LONG_NUMBER, ':num').split('?')[0];
  }
}

const ALLOWED_EXTRA_KEYS = new Set([
  'operation',
  'appErrorCode',
  'platform',
  'version',
  'environment',
]);

const ALLOWED_CONTEXT_KEYS = new Set(['device', 'os', 'app', 'culture', 'react', 'expo']);

function sanitizeExtra(extra: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!extra) return {};
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(extra)) {
    if (ALLOWED_EXTRA_KEYS.has(key)) {
      sanitized[key] = extra[key];
    }
  }
  return sanitized;
}

function sanitizeContexts(contexts: ErrorEvent['contexts']): ErrorEvent['contexts'] {
  if (!contexts) return {};
  const sanitized: Sentry.Event['contexts'] = {};
  for (const key of Object.keys(contexts)) {
    if (ALLOWED_CONTEXT_KEYS.has(key)) {
      sanitized[key] = contexts[key];
    }
  }
  return sanitized;
}

function sanitizeExceptions(exceptions: ErrorEvent['exception']): ErrorEvent['exception'] {
  if (!exceptions?.values) return exceptions;
  return {
    ...exceptions,
    values: exceptions.values.map((exception) => {
      const value =
        typeof exception.value === 'string'
          ? exception.value.replace(UUID_LIKE, ':id').replace(LONG_NUMBER, ':num')
          : exception.value;
      return {
        ...exception,
        value,
        cause: undefined,
        mechanism: exception.mechanism
          ? {
              type: exception.mechanism.type,
              handled: exception.mechanism.handled,
            }
          : undefined,
      };
    }),
  };
}

export function sanitizeEvent(event: ErrorEvent): ErrorEvent | null {
  const sanitized: ErrorEvent = {
    ...event,
    user: { ip_address: '0.0.0.0' },
    request: event.request
      ? {
          ...event.request,
          url: sanitizeUrl(event.request.url),
          query_string: undefined,
          cookies: undefined,
          headers: undefined,
        }
      : undefined,
    extra: sanitizeExtra(event.extra),
    contexts: sanitizeContexts(event.contexts),
    exception: sanitizeExceptions(event.exception),
    breadcrumbs: event.breadcrumbs
      ?.filter((breadcrumb) => breadcrumb.category !== 'console')
      .map((breadcrumb) => {
        if (!breadcrumb.message) return breadcrumb;
        return {
          ...breadcrumb,
          message: String(breadcrumb.message)
            .replace(UUID_LIKE, ':id')
            .replace(LONG_NUMBER, ':num'),
        };
      }),
  };

  return sanitized;
}

export function beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (breadcrumb.category === 'console') {
    return null;
  }
  if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
    breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
    breadcrumb.data['query_string'] = undefined;
  }
  if (breadcrumb.message) {
    breadcrumb.message = String(breadcrumb.message)
      .replace(UUID_LIKE, ':id')
      .replace(LONG_NUMBER, ':num');
  }
  return breadcrumb;
}

let sentryInitialized = false;

export function initializeSentry(): void {
  if (sentryInitialized) return;
  sentryInitialized = true;

  const dsn = readPublicDsn();
  const environment = getSentryEnvironment();

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release: `directstay-mobile@${Constants.expoConfig?.version ?? '0.0.0'}`,
    dist: `${Constants.expoConfig?.ios?.bundleIdentifier ?? 'dev'}`,
    enabled: true,
    sampleRate: 1.0,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    enableLogs: false,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: sanitizeEvent,
    beforeBreadcrumb,
    integrations: (integrations) => {
      return integrations
        .filter((integration) => integration.name !== 'HttpContext')
        .map((integration) => {
          if (integration.name === 'Breadcrumbs') {
            return Sentry.breadcrumbsIntegration({ console: false });
          }
          return integration;
        });
    },
  });
}

export function isSentryInitialized(): boolean {
  return sentryInitialized;
}

export type OperationalErrorContext = {
  operation: string;
  code?: AppErrorCode;
};

const REPORTABLE_ERROR_CODES: ReadonlySet<AppErrorCode> = new Set([
  'error.generic',
  'error.authFailed',
  'error.authRateLimited',
  'error.sessionRequired',
  'error.configuration',
]);

const NON_REPORTABLE_ERROR_CODES: ReadonlySet<AppErrorCode> = new Set([
  'error.notFound',
  'error.unavailable',
  'error.holdExpired',
  'error.validation',
]);

export function isReportableErrorCode(code: AppErrorCode): boolean {
  return REPORTABLE_ERROR_CODES.has(code);
}

export function isNonReportableDomainCode(code: AppErrorCode): boolean {
  return NON_REPORTABLE_ERROR_CODES.has(code);
}

function buildCaptureInput(
  error: unknown,
  context: OperationalErrorContext,
): { exception: Error; tags: Record<string, string>; extra: Record<string, string> } {
  let exception: Error;
  let code: AppErrorCode;

  if (isAppError(error)) {
    exception = error;
    code = error.code;
  } else if (error instanceof Error) {
    exception = error;
    code = context.code ?? 'error.generic';
  } else {
    exception = new Error(String(error));
    code = context.code ?? 'error.generic';
  }

  const tags: Record<string, string> = {
    operation: context.operation,
    appErrorCode: code,
    platform: Platform.OS,
    version: Constants.expoConfig?.version ?? '0.0.0',
    environment: getSentryEnvironment(),
  };

  const extra: Record<string, string> = {
    operation: context.operation,
    appErrorCode: code,
    platform: tags.platform,
    version: tags.version,
    environment: tags.environment,
  };

  return { exception, tags, extra };
}

const DEDUPLICATE_WINDOW_MS = 5 * 60 * 1000;

class OperationalErrorReporter {
  private readonly reportedErrors = new WeakSet<object>();
  private readonly recentReports = new Map<string, number>();

  private deduplicationKey(operation: string, code: AppErrorCode): string {
    return `${operation}:${code}`;
  }

  private isRecentlyReported(operation: string, code: AppErrorCode): boolean {
    const key = this.deduplicationKey(operation, code);
    const last = this.recentReports.get(key);
    const now = Date.now();
    if (last !== undefined && now - last < DEDUPLICATE_WINDOW_MS) {
      return true;
    }
    this.recentReports.set(key, now);
    return false;
  }

  report(error: unknown, context: OperationalErrorContext): void {
    const input = buildCaptureInput(error, context);

    if (isNonReportableDomainCode(input.tags.appErrorCode as AppErrorCode)) {
      return;
    }

    if (!isReportableErrorCode(input.tags.appErrorCode as AppErrorCode)) {
      input.tags.appErrorCode = 'error.generic';
      input.extra.appErrorCode = 'error.generic';
    }

    if (typeof error === 'object' && error !== null && this.reportedErrors.has(error)) {
      return;
    }

    if (this.isRecentlyReported(input.tags.operation, input.tags.appErrorCode as AppErrorCode)) {
      return;
    }

    if (typeof error === 'object' && error !== null) {
      this.reportedErrors.add(error);
    }

    Sentry.captureException(input.exception, {
      tags: input.tags,
      extra: input.extra,
    });
  }
}

const globalReporter = new OperationalErrorReporter();

export function reportOperationalError(error: unknown, context: OperationalErrorContext): void {
  globalReporter.report(error, context);
}

export function createOperationalErrorReporterForTests(): OperationalErrorReporter {
  return new OperationalErrorReporter();
}
