import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, CatalogImage, PriceText } from '@/components';
import type { Unit } from '@/features/property/types';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

interface UnitCardProps {
  unit: Unit;
  onPress: () => void;
}

export function UnitCard({ unit, onPress }: UnitCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('unit.viewDetails', { name: unit.name })}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Card padded={false} style={styles.card}>
        <CatalogImage image={unit.images[0] ?? null} height={150} borderRadius={0} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{unit.name}</Text>
            <Text style={styles.capacity}>{t('unit.maxGuests', { count: unit.maxGuests })}</Text>
          </View>
          <Text style={styles.summary} numberOfLines={2}>
            {unit.summary}
          </Text>
          <View style={styles.priceRow}>
            <PriceText amountMinor={unit.nightlyRateMinor} currency={unit.currency} size="sm" />
            <Text style={styles.perNight}>{t('unit.perNight')}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.9,
  },
  card: {
    overflow: 'hidden',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  capacity: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  summary: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  perNight: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
