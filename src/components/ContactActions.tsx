import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAnnounce } from '@/lib/use-announce';
import { colors, control, fontSize, radius, spacing } from '@/lib/theme';

interface ContactActionsProps {
  whatsapp: string | null;
  phone: string | null;
  propertyName: string;
}

export function ContactActions({ whatsapp, phone, propertyName }: ContactActionsProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  useAnnounce(failed ? t('common.linkUnavailable') : undefined);
  const whatsappDigits = whatsapp?.replace(/\D/g, '') ?? '';
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(t('bookings.whatsappDraft', { propertyName }))}`;

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bookings.whatsappCta')}
            onPress={() => void open(whatsappUrl)}
            style={({ pressed }) => [
              styles.action,
              styles.whatsAppAction,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.icon, styles.whatsAppIcon]}>
              <Image
                source={require('../../assets/images/whatsapp-bootstrap.png')}
                style={styles.whatsAppMark}
              />
            </View>
            <Text style={[styles.label, styles.whatsAppLabel]}>
              {t('bookings.whatsappShortCta')}
            </Text>
          </Pressable>
        ) : null}
        {phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bookings.callCta')}
            onPress={() => void open(`tel:${phone}`)}
            style={({ pressed }) => [styles.action, styles.callAction, pressed && styles.pressed]}
          >
            <View style={[styles.icon, styles.callIcon]}>
              <Text style={styles.callGlyph}>📞</Text>
            </View>
            <Text style={[styles.label, styles.callLabel]}>{t('bookings.callCta')}</Text>
          </Pressable>
        ) : null}
      </View>
      {failed ? <Text style={styles.feedback}>{t('common.linkUnavailable')}</Text> : null}
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
  action: {
    minHeight: control.minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  whatsAppAction: {
    borderColor: '#25D366',
    backgroundColor: '#E6F7ED',
  },
  callAction: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  whatsAppIcon: {
    backgroundColor: '#25D366',
  },
  callIcon: {
    backgroundColor: colors.border,
  },
  whatsAppMark: {
    width: 19,
    height: 19,
    tintColor: colors.white,
  },
  callGlyph: {
    fontSize: 13,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  whatsAppLabel: {
    color: '#075E54',
  },
  callLabel: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.75,
  },
  feedback: {
    fontSize: fontSize.xs,
    color: colors.warning,
  },
});
