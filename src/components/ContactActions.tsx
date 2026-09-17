import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, fontSize, spacing } from '@/lib/theme';

interface ContactActionsProps {
  whatsapp: string | null;
  phone: string | null;
}

/** Property contact actions. Renders nothing when no contact detail is configured. */
export function ContactActions({ whatsapp, phone }: ContactActionsProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  if (!whatsapp && !phone) {
    return <Text style={styles.feedback}>{t('common.contactUnavailable')}</Text>;
  }

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
        {whatsapp ? (
          <Button
            title={t('bookings.whatsappCta')}
            variant="secondary"
            onPress={() => void open(`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`)}
            style={styles.flex}
          />
        ) : null}
        {phone ? (
          <Button
            title={t('bookings.callCta')}
            variant="ghost"
            onPress={() => void open(`tel:${phone}`)}
            style={styles.flex}
          />
        ) : null}
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
