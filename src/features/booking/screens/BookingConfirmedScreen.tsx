import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

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
import { useBooking } from '@/features/booking/queries/use-booking';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import { AddStayToCalendarButton } from '@/features/booking/components/AddStayToCalendarButton';

export function BookingConfirmedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const id = typeof bookingId === 'string' ? bookingId : undefined;
  const query = useBooking(id);

  if (query.isLoading)
    return (
      <Screen>
        <ScreenHeader title={t('booking.confirmedTitle')} showBack={false} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  if (query.isError)
    return (
      <Screen>
        <ScreenHeader title={t('booking.confirmedTitle')} showBack={false} />
        <ErrorState
          title={t('error.title')}
          message={t(getErrorCode(query.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  const booking = query.data;
  if (!booking || booking.status !== 'CONFIRMED')
    return (
      <Screen>
        <ScreenHeader title={t('booking.confirmedTitle')} showBack={false} />
        <EmptyState title={t('bookings.notFoundTitle')} message={t('bookings.notFoundMessage')} />
      </Screen>
    );

  return (
    <Screen scroll>
      <ScreenHeader title={t('booking.confirmedTitle')} showBack={false} />
      <Text style={styles.title}>{t('booking.confirmedTitle')}</Text>
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
      <View style={styles.footer}>
        <AddStayToCalendarButton booking={booking} />
        <Button
          title={t('booking.viewBookingCta')}
          fullWidth
          onPress={() =>
            router.replace({ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } })
          }
        />
        <Button
          title={t('bookings.stayCta')}
          variant="secondary"
          fullWidth
          onPress={() =>
            router.replace({ pathname: '/stay/[bookingId]', params: { bookingId: booking.id } })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: { gap: spacing.md },
  unit: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  footer: { marginTop: spacing.xl, gap: spacing.md },
});
