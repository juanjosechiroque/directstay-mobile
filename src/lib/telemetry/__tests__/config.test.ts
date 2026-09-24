import type { ErrorEvent } from '@sentry/core';
import * as Sentry from '@sentry/react-native';

import { AppError, type AppErrorCode } from '@/lib/errors';

import {
  beforeBreadcrumb,
  createOperationalErrorReporterForTests,
  getSentryEnvironment,
  sanitizeEvent,
} from '../config';

describe('telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getSentryEnvironment', () => {
    const original = process.env;

    beforeEach(() => {
      process.env = { ...original };
    });

    afterAll(() => {
      process.env = original;
    });

    it.each([
      ['production', 'production'],
      ['preview', 'preview'],
      ['development', 'development'],
      [undefined, 'development'],
    ])('maps EAS_BUILD_PROFILE=%s to %s', (profile, expected) => {
      if (profile === undefined) {
        delete process.env.EAS_BUILD_PROFILE;
      } else {
        process.env.EAS_BUILD_PROFILE = profile;
      }
      expect(getSentryEnvironment()).toBe(expected);
    });
  });

  describe('OperationalErrorReporter', () => {
    function createReporter() {
      return createOperationalErrorReporterForTests();
    }

    it('reports unexpected AppError codes', () => {
      const reporter = createReporter();
      const error = new AppError('error.generic');
      reporter.report(error, { operation: 'booking.createBooking' });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            operation: 'booking.createBooking',
            appErrorCode: 'error.generic',
            platform: expect.any(String),
            version: '1.0.0',
            environment: 'development',
          }),
        }),
      );
    });

    it.each(['error.unavailable', 'error.holdExpired', 'error.validation', 'error.notFound'])(
      'ignores expected domain code %s',
      (code) => {
        const reporter = createReporter();
        reporter.report(new AppError(code as AppErrorCode), {
          operation: 'booking.createBooking',
        });
        expect(Sentry.captureException).not.toHaveBeenCalled();
      },
    );

    it('reports non-AppError errors as generic', () => {
      const reporter = createReporter();
      const error = new Error('network failure');
      reporter.report(error, { operation: 'auth.restoreSession' });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            operation: 'auth.restoreSession',
            appErrorCode: 'error.generic',
          }),
        }),
      );
    });

    it('does not report the same error instance twice', () => {
      const reporter = createReporter();
      const error = new AppError('error.generic');
      reporter.report(error, { operation: 'booking.createBooking' });
      reporter.report(error, { operation: 'booking.createBooking' });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it('does not report the same operation+code within the deduplication window', () => {
      const reporter = createReporter();
      reporter.report(new AppError('error.generic'), {
        operation: 'booking.createBooking',
      });
      reporter.report(new Error('different failure'), {
        operation: 'booking.createBooking',
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it('reports again after the deduplication window expires', () => {
      const reporter = createReporter();
      reporter.report(new AppError('error.generic'), {
        operation: 'booking.createBooking',
      });
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      reporter.report(new Error('later failure'), {
        operation: 'booking.createBooking',
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    });

    it('does not include personal data in tags or extra', () => {
      const reporter = createReporter();
      const error = new AppError('error.generic');
      reporter.report(error, {
        operation: 'booking.createBooking',
      });

      const options = (Sentry.captureException as jest.Mock).mock.calls[0][1] as {
        tags: Record<string, string>;
        extra: Record<string, string>;
      };
      const text = JSON.stringify({ tags: options.tags, extra: options.extra });
      expect(text).not.toMatch(/juan|guest|email|phone|password|special|booking-id/i);
    });
  });

  describe('sanitizeEvent', () => {
    it('removes PII and keeps only allowed extra/context keys', () => {
      const event = {
        type: undefined,
        message: 'failure',
        user: { email: 'guest@example.com', id: 'profile-123' },
        request: {
          url: 'https://api.example.com/bookings/550e8400-e29b-41d4-a716-446655440000?email=guest@example.com',
          query_string: 'email=guest@example.com',
          cookies: 'session=secret',
          headers: { Authorization: 'Bearer secret' } as Record<string, string>,
        },
        extra: {
          operation: 'booking.createBooking',
          appErrorCode: 'error.generic',
          platform: 'ios',
          version: '1.0.0',
          environment: 'development',
          guestName: 'Juan',
        },
        contexts: {
          device: { model: 'iPhone' },
          profile: { email: 'guest@example.com' },
        },
        breadcrumbs: [
          { category: 'console', message: 'guest email guest@example.com' },
          { category: 'navigation', message: '/bookings/550e8400-e29b-41d4-a716-446655440000' },
        ],
        exception: {
          values: [
            {
              type: 'Error',
              value: 'booking 550e8400-e29b-41d4-a716-446655440000 failed',
              cause: { message: 'supabase internal details' } as unknown,
              mechanism: { type: 'generic', handled: true, data: { extra: 'data' } },
            },
          ],
        },
      } as unknown as ErrorEvent;

      const sanitized = sanitizeEvent(event);
      expect(sanitized).not.toBeNull();

      const safe = sanitized!;
      expect(safe.user).toEqual({ ip_address: '0.0.0.0' });
      expect(safe.request).toEqual({
        url: 'https://api.example.com/bookings/:id',
        query_string: undefined,
        cookies: undefined,
        headers: undefined,
      });
      expect(safe.extra).toEqual({
        operation: 'booking.createBooking',
        appErrorCode: 'error.generic',
        platform: 'ios',
        version: '1.0.0',
        environment: 'development',
      });
      expect(safe.contexts).toEqual({ device: { model: 'iPhone' } });
      expect(safe.breadcrumbs).toHaveLength(1);
      expect(safe.breadcrumbs?.[0].message).toBe('/bookings/:id');
      const firstException = safe.exception?.values?.[0];
      expect(firstException).toBeDefined();
      expect((firstException as { cause?: unknown }).cause).toBeUndefined();
      expect(firstException?.value).not.toContain('550e8400');
    });
  });

  describe('beforeBreadcrumb', () => {
    it('drops console breadcrumbs', () => {
      expect(beforeBreadcrumb({ category: 'console', message: 'log with PII' })).toBeNull();
    });

    it('sanitizes http breadcrumb urls', () => {
      const result = beforeBreadcrumb({
        category: 'http',
        data: { url: 'https://api.example.com/bookings/550e8400-e29b-41d4-a716-446655440000?x=1' },
      });
      expect(result?.data?.url).toBe('https://api.example.com/bookings/:id');
      expect(result?.data?.query_string).toBeUndefined();
    });
  });
});
