import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, ScreenHeader } from '@/components';
import { QuoteSummary } from '@/features/booking/components/QuoteSummary';
import { useBookingDraft } from '@/features/booking/draft/booking-draft-context';
import { useStartDemoBooking } from '@/features/booking/queries/use-booking';
import { useBookingQuote } from '@/features/booking/queries/use-booking-quote';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

export function BookingPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stay, guest } = useBookingDraft();
  const payment = useStartDemoBooking();

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

  if (!stay || !guest) {
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

  const canPay = quoteState.isReady && !payment.isPending;

  const handlePay = () => {
    if (!quoteState.isReady) {
      return;
    }
    payment.mutate(
      {
        unitId: stay.unitId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guestCount: stay.guestCount,
        guestName: guest.fullName,
        guestEmail: guest.email,
        guestPhone: guest.phone ? guest.phone : null,
      },
      {
        onSuccess: (result) => {
          // The draft is cleared on the result screen so this screen does not flash its
          // "missing draft" guard while it is being replaced.
          router.replace({
            pathname: '/booking/result',
            params: { bookingId: result.booking.id },
          });
        },
      },
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('booking.paymentTitle')} />

      <Card style={styles.demoCard}>
        <Badge label={t('booking.demoBadge')} tone="accent" />
        <Text style={styles.demoNotice}>{t('booking.demoNotice')}</Text>
      </Card>

      <QuoteSummary state={quoteState} size="lg" />

      {payment.isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('booking.paymentErrorTitle')}</Text>
          <Text style={styles.errorMessage}>{t('booking.paymentErrorMessage')}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          title={payment.isPending ? t('booking.processingCta') : t('booking.payDemoCta')}
          size="lg"
          fullWidth
          loading={payment.isPending}
          disabled={!canPay}
          onPress={handlePay}
        />
        <Text style={styles.note}>{t('booking.demoNote')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoCard: {
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
    marginBottom: spacing.lg,
  },
  demoNotice: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  errorBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    gap: spacing.xs,
  },
  errorTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.danger,
  },
  errorMessage: {
    fontSize: fontSize.sm,
    color: colors.text,
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
