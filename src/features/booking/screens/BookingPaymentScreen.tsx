import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, AppState, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  DateRange,
  EmptyState,
  ErrorState,
  InfoRow,
  LoadingState,
  PriceText,
  Screen,
  ScreenHeader,
} from '@/components';
import { formatHoldCountdown, remainingHoldSeconds } from '@/features/booking/hold-countdown';
import { useBooking } from '@/features/booking/queries/use-booking';
import { useConfirmDemoPayment } from '@/features/booking/queries/use-booking-mutations';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

/**
 * DEMO checkout: no real payment provider is involved and nothing is charged. The button asks
 * the `confirm_demo_payment` RPC to confirm the booking; the client only reflects the result.
 * Replaced when Stripe is integrated (see docs/ARCHITECTURE.md, "Not yet implemented").
 */
export function BookingPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const id = typeof bookingId === 'string' ? bookingId : undefined;
  const bookingQuery = useBooking(id);
  const confirm = useConfirmDemoPayment();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isForeground, setIsForeground] = useState(AppState.currentState !== 'background');
  const [serverExpired, setServerExpired] = useState(false);
  const submitLock = useRef(false);
  const booking = bookingQuery.data;
  const seconds =
    booking && nowMs !== null ? remainingHoldSeconds(booking.holdExpiresAt, nowMs) : 0;
  const expired =
    serverExpired ||
    Boolean(booking && (booking.status !== 'PENDING_PAYMENT' || (nowMs !== null && seconds === 0)));
  const timerEnabled =
    isFocused &&
    isForeground &&
    nowMs !== null &&
    booking?.status === 'PENDING_PAYMENT' &&
    !serverExpired &&
    seconds > 0;
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setNowMs(Date.now());
      const subscription = AppState.addEventListener('change', (state) => {
        const foreground = state === 'active';
        setIsForeground(foreground);
        if (foreground) setNowMs(Date.now());
      });
      return () => {
        setIsFocused(false);
        subscription?.remove?.();
      };
    }, []),
  );

  useEffect(() => {
    if (!timerEnabled) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [timerEnabled]);

  useEffect(() => {
    if (booking?.status === 'CONFIRMED') {
      router.replace({ pathname: '/booking/confirmed', params: { bookingId: booking.id } });
    }
  }, [booking?.id, booking?.status, router]);

  // Screen readers hear milestones only (never every second): 60 s, 30 s, 10 s and expiry.
  const announced = useRef(new Set<number>());
  useEffect(() => {
    if (!booking || nowMs === null || booking.status !== 'PENDING_PAYMENT') return;
    if (expired) {
      if (!announced.current.has(0)) {
        announced.current.add(0);
        AccessibilityInfo.announceForAccessibility(t('error.holdExpired'));
      }
      return;
    }
    const milestone = [10, 30, 60].find((mark) => seconds <= mark);
    if (milestone !== undefined && !announced.current.has(milestone)) {
      for (const mark of [10, 30, 60]) if (mark >= milestone) announced.current.add(mark);
      AccessibilityInfo.announceForAccessibility(
        t('booking.holdMilestone', { time: formatHoldCountdown(seconds) }),
      );
    }
  }, [booking, nowMs, expired, seconds, t]);

  const pay = async () => {
    if (!id || expired || submitLock.current) return;
    submitLock.current = true;
    try {
      const result = await confirm.mutateAsync(id);
      router.replace({ pathname: '/booking/confirmed', params: { bookingId: result.id } });
    } catch (error) {
      if (getErrorCode(error) === 'error.holdExpired') {
        setServerExpired(true);
        void bookingQuery.refetch();
      }
    } finally {
      submitLock.current = false;
    }
  };

  if (!id || (!bookingQuery.isLoading && !bookingQuery.isError && !booking)) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.paymentTitle')} />
        <EmptyState title={t('bookings.notFoundTitle')} message={t('bookings.notFoundMessage')} />
        <Button title={t('booking.goToSearch')} onPress={() => router.replace('/search')} />
      </Screen>
    );
  }
  if (bookingQuery.isLoading || nowMs === null || booking?.status === 'CONFIRMED') {
    return (
      <Screen>
        <ScreenHeader title={t('booking.paymentTitle')} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }
  if (bookingQuery.isError) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.paymentTitle')} />
        <ErrorState
          title={t('error.title')}
          message={t(getErrorCode(bookingQuery.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void bookingQuery.refetch()}
        />
      </Screen>
    );
  }
  if (!booking) return null;

  return (
    <Screen scroll>
      <ScreenHeader title={t('booking.paymentTitle')} />
      <Card style={styles.card}>
        <Text style={styles.unit}>{booking.unitName}</Text>
        <DateRange checkIn={booking.checkIn} checkOut={booking.checkOut} />
        <InfoRow label={t('bookings.guestsLabel')} value={String(booking.guestCount)} />
        <InfoRow
          label={t('booking.totalLabel')}
          value=""
          valueNode={
            <PriceText
              amountMinor={booking.totalAmountMinor}
              currency={booking.currency}
              size="lg"
            />
          }
        />
      </Card>
      {expired ? (
        <EmptyState title={t('booking.holdExpiredTitle')} message={t('error.holdExpired')} />
      ) : (
        <View style={styles.holdCard}>
          <Text style={styles.holdText}>{t('booking.holdTemporary')}</Text>
          <Text style={styles.countdown} accessibilityRole="timer">
            {t('booking.holdCountdown', { time: formatHoldCountdown(seconds) })}
          </Text>
        </View>
      )}
      {confirm.isError && !expired ? (
        <ErrorState
          title={t('booking.paymentErrorTitle')}
          message={t(getErrorCode(confirm.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void pay()}
        />
      ) : null}
      <View style={styles.footer}>
        <Button
          title={t('booking.demoPayCta')}
          size="lg"
          fullWidth
          disabled={expired || confirm.isPending}
          loading={confirm.isPending}
          onPress={() => void pay()}
        />
        <Text style={styles.note}>{t('booking.noChargeNote')}</Text>
        {expired ? (
          <Button
            title={t('booking.goToSearch')}
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/search')}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  unit: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  holdCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  holdText: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  countdown: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  footer: { marginTop: spacing.xl, gap: spacing.md },
  note: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
