import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components';
import { spacing } from '@/lib/theme';

interface ContactActionsProps {
  whatsapp: string;
  phone: string;
}

async function open(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // The device may not have an app that can handle the scheme; the demo simply ignores it.
  }
}

export function ContactActions({ whatsapp, phone }: ContactActionsProps) {
  const { t } = useTranslation();
  const digits = whatsapp.replace(/[^0-9]/g, '');

  return (
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
