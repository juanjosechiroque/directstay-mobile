import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, Text, View } from 'react-native';

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

export function BookingPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const id = typeof bookingId === 'string' ? bookingId : undefined;
  const bookingQuery = useBooking(id);
  const confirm = useConfirmDemoPayment();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [serverExpired, setServerExpired] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    const start = setTimeout(() => setNowMs(Date.now()), 0);
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNowMs(Date.now());
    });
    return () => {
      clearTimeout(start);
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const booking = bookingQuery.data;
  useEffect(() => {
    if (booking?.status === 'CONFIRMED') {
      router.replace({ pathname: '/booking/confirmed', params: { bookingId: booking.id } });
    }
  }, [booking?.id, booking?.status, router]);

  const seconds =
    booking && nowMs !== null ? remainingHoldSeconds(booking.holdExpiresAt, nowMs) : 0;
  const expired =
    serverExpired || Boolean(booking && (booking.status !== 'PENDING_PAYMENT' || seconds === 0));

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
        <Text style={styles.countdown}>
          {t('booking.holdCountdown', { time: formatHoldCountdown(seconds) })}
        </Text>
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
  countdown: { marginTop: spacing.lg, fontSize: fontSize.md, color: colors.text },
  footer: { marginTop: spacing.xl, gap: spacing.md },
  note: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
