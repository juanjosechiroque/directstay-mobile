import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SUPPORTED_LOCALES } from '@/i18n';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

const LABELS: Record<string, string> = { es: 'ES', en: 'EN' };
const NAMES: Record<string, string> = { es: 'settings.languageEs', en: 'settings.languageEn' };

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.row}>
      {SUPPORTED_LOCALES.map((locale) => {
        const active = i18n.language.startsWith(locale);
        return (
          <Pressable
            key={locale}
            onPress={() => void i18n.changeLanguage(locale)}
            accessibilityRole="button"
            accessibilityLabel={t(NAMES[locale])}
            accessibilityState={{ selected: active }}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{LABELS[locale]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'flex-end' },
  option: {
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  optionActive: { backgroundColor: colors.primary },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  labelActive: { color: colors.white },
});
