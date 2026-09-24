import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatIsoDate, type IsoDate } from '@/lib/dates';
import { useAnnounce } from '@/lib/use-announce';
import { colors, control, fontSize, radius, spacing } from '@/lib/theme';
import { Calendar } from '@/features/search/components/Calendar';

interface DateFieldProps {
  label: string;
  value: IsoDate | null;
  onChange: (date: IsoDate) => void;
  placeholder: string;
  minDate?: IsoDate;
  maxDate?: IsoDate;
  todayDate?: IsoDate;
  error?: string;
  disabled?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
  todayDate,
  error,
  disabled = false,
}: DateFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  useAnnounce(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatIsoDate(value, i18n.language) : placeholder}`}
        accessibilityHint={t('search.selectDateHint')}
        accessibilityState={{ disabled }}
        style={[styles.field, error ? styles.fieldError : null, disabled && styles.fieldDisabled]}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatIsoDate(value, i18n.language) : placeholder}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Calendar
              key={minDate}
              selected={value}
              minDate={minDate}
              maxDate={maxDate}
              todayDate={todayDate}
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
            />
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              style={styles.closeButton}
            >
              <Text style={styles.closeLabel}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  field: {
    minHeight: control.minTouchSize,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  placeholder: {
    fontSize: fontSize.md,
    color: colors.textSubtle,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'center',
    minHeight: control.minTouchSize,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  closeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
