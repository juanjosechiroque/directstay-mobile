import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/lib/theme';

interface InfoRowProps {
  label: string;
  value: string;
  valueNode?: ReactNode;
}

export function InfoRow({ label, value, valueNode }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {valueNode ?? <Text style={styles.value}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  label: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  value: {
    flex: 1.2,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
});
