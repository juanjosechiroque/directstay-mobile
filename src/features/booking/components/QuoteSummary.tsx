import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { Card, ErrorState, LoadingState, PriceText } from '@/components';
import type { UseBookingQuoteResult } from '@/features/booking/queries/use-booking';
import { colors, fontSize, spacing } from '@/lib/theme';

interface QuoteSummaryProps {
  state: UseBookingQuoteResult;
  size?: 'md' | 'lg';
}

/**
 * Shared quote renderer for the guest and payment steps. It always communicates one of
 * three states — loading, error with retry, or the server-provided amount — so no booking
 * screen can silently sit with a disabled CTA and no explanation.
 */
export function QuoteSummary({ state, size = 'md' }: QuoteSummaryProps) {
  const { t } = useTranslation();

  if (state.isError) {
    return (
      <ErrorState
        title={t('booking.quoteErrorTitle')}
        message={t(state.errorCode)}
        retryLabel={t('common.retry')}
        onRetry={state.retry}
      />
    );
  }

  if (!state.data) {
    return <LoadingState message={t('booking.quoteLoading')} />;
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{t('booking.totalLabel')}</Text>
      <PriceText
        amountMinor={state.data.totalAmountMinor}
        currency={state.data.currency}
        size={size}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
