import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useAnnounce } from '@/lib/use-announce';
import { colors, control, fontSize, radius, spacing } from '@/lib/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, helper, required, style, ...inputProps },
  ref,
) {
  const { t } = useTranslation();
  const helperColor = error ? colors.danger : colors.textMuted;
  useAnnounce(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={required ? `${label}, ${t('common.required')}` : label}
        accessibilityHint={error ?? helper}
        accessibilityState={{ disabled: inputProps.editable === false }}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? (
        <Text style={[styles.helper, { color: helperColor }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: helperColor }]}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  input: {
    minHeight: control.minTouchSize,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  helper: {
    fontSize: fontSize.xs,
  },
});
