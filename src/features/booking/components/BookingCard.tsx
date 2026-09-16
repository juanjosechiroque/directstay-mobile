import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, DateRange, PriceText } from '@/components';
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge';
import type { Booking } from '@/features/booking/types';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${booking.unitName}. ${t(`booking.status.${booking.status}`)}`}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Card>
        <View style={styles.header}>
          <Text style={styles.unit}>{booking.unitName}</Text>
          <BookingStatusBadge status={booking.status} />
        </View>
        <DateRange checkIn={booking.checkIn} checkOut={booking.checkOut} style={styles.dates} />
        <View style={styles.footer}>
          <Text style={styles.meta}>
            {t('booking.nightsLabel', { count: booking.nights })} ·{' '}
            {t('booking.guestsLabel', { count: booking.guestCount })}
          </Text>
          <PriceText amountMinor={booking.totalAmountMinor} currency={booking.currency} size="sm" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  unit: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  dates: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flexShrink: 1,
  },
});
