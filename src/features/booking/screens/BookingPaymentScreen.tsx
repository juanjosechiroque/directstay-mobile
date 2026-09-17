import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, ScreenHeader } from '@/components';
import { QuoteSummary } from '@/features/booking/components/QuoteSummary';
import { useBookingDraft } from '@/features/booking/draft/booking-draft-context';
import { useBookingQuote } from '@/features/booking/queries/use-booking-quote';
import { colors, fontSize, spacing } from '@/lib/theme';

/**
 * Payment step placeholder.
 *
 * Payments, booking creation and confirmation are NOT enabled in this phase. The client
 * deliberately has no way to create a booking or simulate a payment, so this screen states
 * that clearly instead of showing a fake success. The server-side `create_booking` RPC is
 * prepared and tested but revoked from the mobile roles until Stripe is integrated.
 */
export function BookingPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stay } = useBookingDraft();

  const quoteState = useBookingQuote(
    stay
      ? {
          unitId: stay.unitId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guestCount: stay.guestCount,
        }
      : null,
  );

  if (!stay) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.paymentTitle')} />
        <EmptyState
          title={t('booking.draftMissingTitle')}
          message={t('booking.draftMissingMessage')}
        />
        <Button title={t('booking.goToSearch')} onPress={() => router.replace('/search')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('booking.paymentTitle')} />

      <Card style={styles.noticeCard}>
        <Badge label={t('booking.paymentsUnavailableBadge')} tone="warning" />
        <Text style={styles.noticeTitle}>{t('booking.paymentsUnavailableTitle')}</Text>
        <Text style={styles.noticeBody}>{t('booking.paymentsUnavailableMessage')}</Text>
      </Card>

      <QuoteSummary state={quoteState} size="lg" />

      <View style={styles.footer}>
        <Button title={t('booking.paymentsUnavailableCta')} size="lg" fullWidth disabled />
        <Button
          title={t('booking.goToSearch')}
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/search')}
        />
        <Text style={styles.note}>{t('booking.paymentsUnavailableNote')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noticeCard: {
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningSoft,
    marginBottom: spacing.lg,
  },
  noticeTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  noticeBody: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
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
