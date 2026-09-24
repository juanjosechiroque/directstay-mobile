import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  DateRange,
  Divider,
  EmptyState,
  ErrorState,
  InfoRow,
  LoadingState,
  Screen,
  ScreenHeader,
  Section,
} from '@/components';
import { ContactActions } from '@/components/ContactActions';
import { useSession } from '@/features/auth/queries/use-session';
import { useStay } from '@/features/stay/queries/use-stay';
import { getErrorCode } from '@/lib/errors';
import { useAnnounce } from '@/lib/use-announce';
import { colors, control, fontSize, spacing } from '@/lib/theme';

/**
 * My Stay.
 *
 * Every private field comes from the owner-scoped `get_stay_information` RPC, available
 * only while the caller owns a CONFIRMED booking. When there is no confirmed booking the
 * screen shows an empty state — never demo or another guest's data.
 */
export function StayScreen() {
  const { t } = useTranslation();
  const { status } = useSession();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;

  const stayQuery = useStay(status === 'signedIn' ? bookingId : undefined);
  const [copied, setCopied] = useState(false);
  useAnnounce(copied ? t('stay.passwordCopied') : undefined);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (status === 'loading' || stayQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('stay.title')} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (stayQuery.isError) {
    return (
      <Screen>
        <ScreenHeader title={t('stay.title')} />
        <ErrorState
          title={t('error.title')}
          message={stayQuery.error ? t(getErrorCode(stayQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void stayQuery.refetch()}
        />
      </Screen>
    );
  }

  if (status === 'signedOut' || !stayQuery.data) {
    return (
      <Screen>
        <ScreenHeader title={t('stay.title')} />
        <EmptyState title={t('stay.notAvailableTitle')} message={t('stay.notAvailableMessage')} />
      </Screen>
    );
  }

  const { booking, propertyName, checkInTime, checkOutTime, information } = stayQuery.data;
  const notSet = t('common.notAvailable');

  const copyPassword = async () => {
    if (!information.wifiPassword) return;
    await Clipboard.setStringAsync(information.wifiPassword);
    setCopied(true);
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('stay.title')} />

      <Card>
        <Text style={styles.property}>{propertyName}</Text>
        <Text style={styles.unit}>{booking.unitName}</Text>
        <DateRange checkIn={booking.checkIn} checkOut={booking.checkOut} style={styles.dates} />
      </Card>

      <Section title={t('stay.wifiTitle')}>
        <Card>
          <InfoRow label={t('stay.wifiNetwork')} value={information.wifiNetwork ?? notSet} />
          <Divider />
          <View style={styles.passwordBlock}>
            <View style={styles.passwordHeader}>
              <Text style={styles.passwordLabel}>{t('stay.wifiPassword')}</Text>
              {information.wifiPassword ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('stay.copyPassword')}
                  onPress={() => void copyPassword()}
                  style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
                >
                  <Text style={styles.copyLabel}>
                    {copied ? t('stay.passwordCopied') : t('stay.copyPassword')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text selectable style={styles.passwordValue}>
              {information.wifiPassword ?? notSet}
            </Text>
          </View>
        </Card>
      </Section>

      <Section title={t('stay.breakfastTitle')}>
        <Card>
          <Text style={styles.body}>{information.breakfastInfo ?? notSet}</Text>
        </Card>
      </Section>

      <Section title={t('stay.scheduleTitle')}>
        <Card>
          <InfoRow label={t('stay.checkInLabel')} value={checkInTime} />
          <Divider />
          <InfoRow label={t('stay.checkOutLabel')} value={checkOutTime} />
        </Card>
      </Section>

      <Section title={t('stay.directionsTitle')}>
        <Card>
          <Text style={styles.body}>{information.checkinInstructions ?? notSet}</Text>
          <Divider spaced />
          <Text style={styles.body}>{information.directions ?? notSet}</Text>
        </Card>
      </Section>

      <Section title={t('stay.contactTitle')}>
        <Card style={styles.contactCard}>
          <ContactActions
            whatsapp={stayQuery.data.contactWhatsapp}
            phone={stayQuery.data.contactPhone}
            propertyName={stayQuery.data.propertyName}
          />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  property: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  unit: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  dates: {
    marginTop: spacing.xs,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 21,
  },
  passwordBlock: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  passwordLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  passwordValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  copyButton: {
    minHeight: control.minTouchSize,
    justifyContent: 'center',
  },
  copyLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  contactCard: {
    gap: spacing.md,
  },
});
