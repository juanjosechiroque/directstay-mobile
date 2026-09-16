import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { formatMinorUnits } from '@/lib/formatters/money';
import { colors, fontSize } from '@/lib/theme';

interface PriceTextProps {
  amountMinor: number;
  currency: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted' | 'accent';
  style?: StyleProp<TextStyle>;
}

const SIZE_MAP = {
  sm: fontSize.sm,
  md: fontSize.lg,
  lg: fontSize.xxl,
} as const;

export function PriceText({
  amountMinor,
  currency,
  suffix,
  size = 'md',
  tone = 'default',
  style,
}: PriceTextProps) {
  const { i18n } = useTranslation();
  const toneColor =
    tone === 'muted' ? colors.textMuted : tone === 'accent' ? colors.accent : colors.text;

  return (
    <Text style={[{ fontSize: SIZE_MAP[size], fontWeight: '700', color: toneColor }, style]}>
      {formatMinorUnits(amountMinor, currency, i18n.language)}
      {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  suffix: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
