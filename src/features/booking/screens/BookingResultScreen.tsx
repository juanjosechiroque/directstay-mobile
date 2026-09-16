import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '@/components';
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge';
import { useBooking } from '@/features/booking/queries/use-booking';
import type { BookingStatus } from '@/features/booking/types';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

const MESSAGE_KEYS: Record<BookingStatus, { title: string; message: string }> = {
  CONFIRMED: { title: 'booking.confirmedTitle', message: 'booking.confirmedMessage' },
  PENDING_PAYMENT: { title: 'booking.pendingTitle', message: 'booking.pendingMessage' },
  CANCELED: { title: 'booking.pendingTitle', message: 'booking.canceledMessage' },
  REFUNDED: { title: 'booking.pendingTitle', message: 'booking.refundedMessage' },
};

export function BookingResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;

  const bookingQuery = useBooking(bookingId);

  if (bookingQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader showBack={false} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (bookingQuery.isError) {
    return (
      <Screen>
        <ScreenHeader showBack={false} />
        <ErrorState
          title={t('error.title')}
          message={bookingQuery.error ? t(getErrorCode(bookingQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void bookingQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!bookingQuery.data) {
    return (
      <Screen>
        <ScreenHeader showBack={false} />
        <EmptyState title={t('bookings.notFoundTitle')} message={t('bookings.notFoundMessage')} />
      </Screen>
    );
  }

  const booking = bookingQuery.data;
  const copy = MESSAGE_KEYS[booking.status];

  return (
    <Screen scroll>
      <ScreenHeader showBack={false} title={t('booking.resultTitle')} />

      <Card style={styles.card}>
        <View style={styles.badgeRow}>
          <BookingStatusBadge status={booking.status} />
        </View>
        <Text style={styles.title}>{t(copy.title)}</Text>
        <Text style={styles.message}>{t(copy.message)}</Text>
        <Text style={styles.subtitle}>{t('booking.resultSubtitle')}</Text>
      </Card>

      <View style={styles.footer}>
        <Button
          title={t('booking.goToBooking')}
          size="lg"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } })
          }
        />
        <Button
          title={t('booking.goToBookings')}
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/bookings')}
        />
        <Text style={styles.note}>{t('booking.demoNote')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
