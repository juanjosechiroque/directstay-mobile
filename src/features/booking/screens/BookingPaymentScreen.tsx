import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PriceText,
  Screen,
  ScreenHeader,
} from '@/components';
import { useQuote, useStartDemoBooking } from '@/features/booking/queries/use-booking';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { toIsoDateParam, toPositiveIntParam } from '@/lib/validation';

export function BookingPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    unitId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  }>();

  const unitId = typeof params.unitId === 'string' ? params.unitId : undefined;
  const checkIn = toIsoDateParam(params.checkIn);
  const checkOut = toIsoDateParam(params.checkOut);
  const guests = toPositiveIntParam(params.guests);
  const fullName = params.fullName ?? '';
  const email = params.email ?? '';
  const phone = params.phone ?? '';

  const quoteQuery = useQuote(
    unitId && checkIn && checkOut && guests
      ? { unitId, checkIn, checkOut, guestCount: guests }
      : null,
  );
  const payment = useStartDemoBooking();

  if (!unitId || !checkIn || !checkOut || !guests || !fullName || !email) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.paymentTitle')} />
        <EmptyState title={t('error.title')} message={t('error.validation')} />
      </Screen>
    );
  }

  const handlePay = () => {
    payment.mutate(
      {
        unitId,
        checkIn,
        checkOut,
        guestCount: guests,
        guestName: fullName,
        guestEmail: email,
        guestPhone: phone.trim() ? phone.trim() : null,
      },
      {
        onSuccess: (result) => {
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

      {quoteQuery.isLoading ? <LoadingState message={t('common.loading')} /> : null}

      {quoteQuery.data ? (
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>{t('booking.amountLabel')}</Text>
          <PriceText
            amountMinor={quoteQuery.data.totalAmountMinor}
            currency={quoteQuery.data.currency}
            size="lg"
          />
        </Card>
      ) : null}

      {payment.isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('booking.paymentErrorTitle')}</Text>
          <Text style={styles.errorMessage}>{t(getErrorCode(payment.error))}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          title={payment.isPending ? t('booking.processingCta') : t('booking.payDemoCta')}
          size="lg"
          fullWidth
          loading={payment.isPending}
          disabled={!quoteQuery.data || payment.isPending}
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
  amountCard: {
    gap: spacing.xs,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
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
