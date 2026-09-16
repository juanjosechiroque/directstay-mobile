import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, fontSize, spacing } from '@/lib/theme';

interface ContactActionsProps {
  whatsapp: string;
  phone: string;
}

export function ContactActions({ whatsapp, phone }: ContactActionsProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const digits = whatsapp.replace(/[^0-9]/g, '');

  const open = async (url: string) => {
    setFailed(false);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        setFailed(true);
        return;
      }
      await Linking.openURL(url);
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Button
          title={t('bookings.whatsappCta')}
          variant="secondary"
          onPress={() => void open(`https://wa.me/${digits}`)}
          style={styles.flex}
        />
        <Button
          title={t('bookings.callCta')}
          variant="ghost"
          onPress={() => void open(`tel:${phone}`)}
          style={styles.flex}
        />
      </View>
      {failed ? (
        <Text style={styles.feedback} accessibilityLiveRegion="polite">
          {t('common.linkUnavailable')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  feedback: {
    fontSize: fontSize.xs,
    color: colors.warning,
  },
});
