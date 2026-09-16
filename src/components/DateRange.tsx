import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { formatDateRange, type IsoDate } from '@/lib/dates';
import { colors, fontSize } from '@/lib/theme';

interface DateRangeProps {
  checkIn: IsoDate;
  checkOut: IsoDate;
  style?: StyleProp<TextStyle>;
}

export function DateRange({ checkIn, checkOut, style }: DateRangeProps) {
  const { i18n } = useTranslation();
  return (
    <Text style={[styles.text, style]}>{formatDateRange(checkIn, checkOut, i18n.language)}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
