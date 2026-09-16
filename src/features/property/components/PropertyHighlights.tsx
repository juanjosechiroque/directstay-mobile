import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import type { HighlightCode } from '@/features/property/types';
import { colors, fontSize, spacing } from '@/lib/theme';

export function PropertyHighlights({
  highlights,
  description,
}: {
  highlights: HighlightCode[];
  description: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.top}>
      <Text style={styles.heading}>{t('property.aboutTitle')}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.row}>
        {highlights.map((highlight) => (
          <Badge key={highlight} label={t(`highlights.${highlight}`)} tone="accent" />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
