import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/components';
import { colors, control, fontSize, radius, spacing } from '@/lib/theme';

interface PhoneNumberFieldProps {
  countryCode: string;
  localNumber: string;
  onCountryCodeChange: (code: string) => void;
  onLocalNumberChange: (number: string) => void;
  error?: string;
}

export function PhoneNumberField({
  countryCode,
  localNumber,
  onCountryCodeChange,
  onLocalNumberChange,
  error,
}: PhoneNumberFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const options = [
    { code: '51', label: t('booking.phoneCountries.peru') },
    { code: '1', label: t('booking.phoneCountries.usCanada') },
    { code: '34', label: t('booking.phoneCountries.spain') },
    { code: '52', label: t('booking.phoneCountries.mexico') },
    { code: '57', label: t('booking.phoneCountries.colombia') },
    { code: '56', label: t('booking.phoneCountries.chile') },
    { code: '54', label: t('booking.phoneCountries.argentina') },
    { code: '55', label: t('booking.phoneCountries.brazil') },
    { code: '591', label: t('booking.phoneCountries.bolivia') },
    { code: '44', label: t('booking.phoneCountries.uk') },
    { code: '49', label: t('booking.phoneCountries.germany') },
    { code: '33', label: t('booking.phoneCountries.france') },
  ];
  const selected = options.find((option) => option.code === countryCode);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t('booking.phone')} ({t('booking.phoneOptional')})
      </Text>
      <View style={styles.row}>
        <View style={styles.codeField}>
          <Text style={styles.fieldLabel}>{t('booking.phoneCountryCode')}</Text>
          <Pressable
            onPress={() => {
              setCustom(false);
              setCustomCode(selected ? '' : countryCode);
              setOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${t('booking.phoneCountryCode')}: +${countryCode}, ${selected?.label ?? t('booking.phoneOtherCode')}`}
            style={({ pressed }) => [styles.codeButton, pressed && styles.pressed]}
          >
            <Text style={styles.codeText}>+{countryCode} ⌄</Text>
          </Pressable>
        </View>
        <View style={styles.numberField}>
          <TextField
            label={t('booking.phoneNumber')}
            value={localNumber}
            onChangeText={(value) => onLocalNumberChange(value.replace(/\D/g, ''))}
            error={error}
            helper={t('booking.phoneHelper')}
            keyboardType="phone-pad"
            autoComplete="tel-national"
            textContentType="telephoneNumber"
            maxLength={15 - countryCode.length}
            returnKeyType="done"
          />
        </View>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('booking.phoneCountryCode')}</Text>
            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <Pressable
                  key={option.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.code === countryCode }}
                  onPress={() => {
                    onCountryCodeChange(option.code);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Text style={styles.optionCode}>+{option.code}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => setCustom(true)}
                style={styles.option}
              >
                <Text style={styles.optionText}>{t('booking.phoneOtherCode')}</Text>
              </Pressable>
            </ScrollView>
            {custom ? (
              <View style={styles.custom}>
                <TextField
                  label={t('booking.phoneCustomCode')}
                  value={customCode}
                  onChangeText={(value) => setCustomCode(value.replace(/\D/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Button
                  title={t('booking.phoneUseCode')}
                  disabled={!/^[1-9]\d{0,2}$/.test(customCode)}
                  onPress={() => {
                    onCountryCodeChange(customCode);
                    setOpen(false);
                  }}
                />
              </View>
            ) : null}
            <Button title={t('common.close')} variant="ghost" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  codeField: { gap: spacing.xs, width: 108 },
  fieldLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  codeButton: {
    minHeight: control.minTouchSize,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  codeText: { color: colors.text, fontSize: fontSize.md },
  numberField: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  backdrop: { flex: 1, backgroundColor: colors.overlayStrong, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '80%',
  },
  sheetTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  options: { maxHeight: 360 },
  option: {
    minHeight: control.minTouchSize,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { color: colors.text, fontSize: fontSize.md },
  optionCode: { color: colors.textMuted, fontSize: fontSize.md },
  custom: { gap: spacing.sm },
});
