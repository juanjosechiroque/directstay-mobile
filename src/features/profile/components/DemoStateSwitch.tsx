import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { setMockScenario, type MockScenario } from '@/mocks/repositories';
import { useMockScenario } from '@/mocks/repositories/use-mock-scenario';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

const SCENARIOS: MockScenario[] = ['success', 'slow', 'empty', 'error'];

/**
 * Demo-only affordance: lets a reviewer switch the mock repositories between success,
 * loading (slow), empty and error states. It is bound to the mock bundle on purpose and
 * disappears together with it — production screens never read the scenario.
 */
export function DemoStateSwitch() {
  const { t } = useTranslation();
  const active = useMockScenario();

  return (
    <View style={styles.wrap}>
      {SCENARIOS.map((scenario) => {
        const isActive = scenario === active;
        return (
          <Pressable
            key={scenario}
            onPress={() => setMockScenario(scenario)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={[styles.option, isActive && styles.optionActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(`profile.scenario.${scenario}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  optionActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  labelActive: {
    color: colors.white,
  },
});
