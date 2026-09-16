import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Card, DateRange, Divider, InfoRow, MockImage, PriceText } from '@/components';
import type { Quote } from '@/features/booking/types';
import type { Unit } from '@/features/property/types';
import { colors, fontSize, spacing } from '@/lib/theme';

interface StaySummaryCardProps {
  unit: Unit;
  quote: Quote;
}

export function StaySummaryCard({ unit, quote }: StaySummaryCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.unitRow}>
        <MockImage image={unit.images[0]} height={64} style={styles.thumb} />
        <View style={styles.unitText}>
          <Text style={styles.unitName}>{unit.name}</Text>
          <DateRange checkIn={quote.checkIn} checkOut={quote.checkOut} />
        </View>
      </View>

      <Divider spaced />

      <InfoRow
        label={t('booking.nightsLabel', { count: quote.nights })}
        value={t('booking.guestsLabel', { count: quote.guestCount })}
      />
      <InfoRow
        label={t('booking.rateLabel')}
        value=""
        valueNode={
          <PriceText amountMinor={quote.nightlyRateMinor} currency={quote.currency} size="sm" />
        }
      />

      <Divider spaced />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('booking.totalLabel')}</Text>
        <PriceText amountMinor={quote.totalAmountMinor} currency={quote.currency} size="md" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  unitRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    borderRadius: 16,
  },
  unitText: {
    flex: 1,
    gap: spacing.xs,
  },
  unitName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
});
