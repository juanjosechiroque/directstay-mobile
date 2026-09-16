import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingState, Screen, ScreenHeader } from '@/components';
import { useQuote } from '@/features/booking/queries/use-booking';
import { StaySummaryCard } from '@/features/booking/components/StaySummaryCard';
import { useUnit } from '@/features/property/queries/use-property';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import { toIsoDateParam, toPositiveIntParam } from '@/lib/validation';

export function BookingReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    unitId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>();

  const unitId = typeof params.unitId === 'string' ? params.unitId : undefined;
  const checkIn = toIsoDateParam(params.checkIn);
  const checkOut = toIsoDateParam(params.checkOut);
  const guests = toPositiveIntParam(params.guests);

  const unitQuery = useUnit(unitId);
  const quoteRequest =
    unitId && checkIn && checkOut && guests
      ? { unitId, checkIn, checkOut, guestCount: guests }
      : null;
  const quoteQuery = useQuote(quoteRequest);

  if (!unitId || !checkIn || !checkOut || !guests) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <EmptyState title={t('error.title')} message={t('error.validation')} />
      </Screen>
    );
  }

  if (unitQuery.isLoading || quoteQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (unitQuery.isError || quoteQuery.isError) {
    const error = unitQuery.error ?? quoteQuery.error;
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <ErrorState
          title={t('booking.quoteErrorTitle')}
          message={error ? t(getErrorCode(error)) : t('booking.quoteErrorMessage')}
          retryLabel={t('common.retry')}
          onRetry={() => {
            void unitQuery.refetch();
            void quoteQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  if (!unitQuery.data || !quoteQuery.data) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <EmptyState title={t('unit.notFoundTitle')} message={t('unit.notFoundMessage')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('booking.reviewTitle')} />
      <Text style={styles.subtitle}>{t('booking.staySummary')}</Text>

      <StaySummaryCard unit={unitQuery.data} quote={quoteQuery.data} />

      <View style={styles.footer}>
        <Button
          title={t('booking.continueCta')}
          size="lg"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/booking/guest',
              params: { unitId, checkIn, checkOut, guests: String(guests) },
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
