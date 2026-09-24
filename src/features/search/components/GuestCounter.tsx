import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAnnounce } from '@/lib/use-announce';
import { colors, control, fontSize, radius, spacing } from '@/lib/theme';

interface GuestCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  error?: string;
}

export function GuestCounter({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  error,
}: GuestCounterProps) {
  const { t } = useTranslation();
  const decreaseDisabled = disabled || value <= min;
  const increaseDisabled = disabled || value >= max;
  const valueText = t('search.guestsValue', { count: value });
  useAnnounce(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('search.guests')}</Text>
      <View style={[styles.controls, error ? styles.controlsError : null]}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={decreaseDisabled}
          accessibilityRole="button"
          accessibilityLabel={t('search.decreaseGuests')}
          accessibilityValue={{ text: valueText }}
          hitSlop={8}
          accessibilityState={{ disabled: decreaseDisabled }}
          style={({ pressed }) => [
            styles.stepButton,
            pressed && styles.pressed,
            decreaseDisabled && styles.disabled,
          ]}
        >
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <Text style={styles.value} accessibilityLiveRegion="polite">
          {valueText}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={increaseDisabled}
          accessibilityRole="button"
          accessibilityLabel={t('search.increaseGuests')}
          accessibilityValue={{ text: valueText }}
          hitSlop={8}
          accessibilityState={{ disabled: increaseDisabled }}
          style={({ pressed }) => [
            styles.stepButton,
            pressed && styles.pressed,
            increaseDisabled && styles.disabled,
          ]}
        >
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    borderColor: colors.borderStrong,
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
