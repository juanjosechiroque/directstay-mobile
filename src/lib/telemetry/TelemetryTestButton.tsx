import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { captureTestError } from '@/lib/telemetry/config';
import { colors, control, fontSize, spacing } from '@/lib/theme';

/**
 * Development-only trigger for a Sentry test event, rendered on the Home screen. Returns
 * null outside `__DEV__`, so release bundles drop it entirely; it exists only to verify the
 * telemetry wiring on a development build (see docs/OBSERVABILITY.md).
 */
export function TelemetryTestButton() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  if (!__DEV__) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('dev.telemetryTest')}
      onPress={() => {
        captureTestError();
        setSent(true);
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{sent ? t('dev.telemetryTestSent') : t('dev.telemetryTest')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: control.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
  pressed: {
    opacity: 0.7,
  },
});
