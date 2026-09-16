import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/lib/theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  small?: boolean;
}

const TONES: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: colors.neutralSoft, text: colors.textMuted },
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  info: { background: colors.infoSoft, text: colors.info },
  accent: { background: colors.accentSoft, text: colors.accent },
};

export function Badge({ label, tone = 'neutral', small = false }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, small && styles.small, { backgroundColor: palette.background }]}>
      <Text
        style={[styles.label, small && styles.smallLabel, { color: palette.text }]}
        accessibilityLabel={label}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  smallLabel: {
    fontSize: fontSize.xs,
  },
});
