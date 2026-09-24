import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingState, Screen, ScreenHeader } from '@/components';
import { StaySummaryCard } from '@/features/booking/components/StaySummaryCard';
import { useBookingDraft } from '@/features/booking/draft/booking-draft-context';
import { useBookingQuote } from '@/features/booking/queries/use-booking';
import { useUnit } from '@/features/property/queries/use-property';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import { toIsoDateParam, toPositiveIntParam } from '@/lib/validation';

export function BookingReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setStay } = useBookingDraft();
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
  const quoteState = useBookingQuote(quoteRequest);

  // Route params here carry only identifiers/business dates (no PII). Capture them in the
  // in-memory draft so later steps can use a single source for the stay details. The quote
  // itself is not stored: later steps re-request it (a price is a server snapshot, not draft state).
  useEffect(() => {
    if (unitId && checkIn && checkOut && guests) {
      setStay({ unitId, checkIn, checkOut, guestCount: guests });
    }
  }, [unitId, checkIn, checkOut, guests, setStay]);

  if (!unitId || !checkIn || !checkOut || !guests) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <EmptyState title={t('error.title')} message={t('error.validation')} />
        <Button title={t('booking.goToSearch')} onPress={() => router.replace('/search')} />
      </Screen>
    );
  }

  if (unitQuery.isLoading || quoteState.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (unitQuery.isError || quoteState.isError) {
    const error = unitQuery.error ?? quoteState.error;
    return (
      <Screen>
        <ScreenHeader title={t('booking.reviewTitle')} />
        <ErrorState
          title={t('booking.quoteErrorTitle')}
          message={error ? t(getErrorCode(error)) : t('booking.quoteErrorMessage')}
          retryLabel={t('common.retry')}
          onRetry={() => {
            void unitQuery.refetch();
            quoteState.retry();
          }}
        />
      </Screen>
    );
  }

  if (!unitQuery.data || !quoteState.data) {
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

      <StaySummaryCard unit={unitQuery.data} quote={quoteState.data} />

      <View style={styles.footer}>
        <Button
          title={t('booking.continueCta')}
          size="lg"
          fullWidth
          onPress={() => router.push('/booking/guest')}
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
