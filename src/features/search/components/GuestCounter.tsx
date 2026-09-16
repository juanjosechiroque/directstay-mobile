import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, fontSize, radius, spacing } from '@/lib/theme';

interface GuestCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  error?: string;
}

export function GuestCounter({ value, onChange, min = 1, max = 8, error }: GuestCounterProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('search.guests')}</Text>
      <View style={[styles.controls, error ? styles.controlsError : null]}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={t('search.decreaseGuests')}
          accessibilityState={{ disabled: value <= min }}
          style={({ pressed }) => [
            styles.stepButton,
            pressed && styles.pressed,
            value <= min && styles.disabled,
          ]}
        >
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <Text style={styles.value} accessibilityLabel={t('search.guestsValue', { count: value })}>
          {t('search.guestsValue', { count: value })}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={t('search.increaseGuests')}
          accessibilityState={{ disabled: value >= max }}
          style={({ pressed }) => [
            styles.stepButton,
            pressed && styles.pressed,
            value >= max && styles.disabled,
          ]}
        >
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: control.minTouchSize,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  controlsError: {
    borderColor: colors.danger,
  },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  stepGlyph: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 22,
  },
  value: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
