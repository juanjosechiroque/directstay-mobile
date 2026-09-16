import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/lib/theme';

export function Divider({ spaced = false }: { spaced?: boolean }) {
  return <View style={[styles.divider, spaced && styles.spaced]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  spaced: {
    marginVertical: spacing.md,
  },
});
