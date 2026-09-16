import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

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
import { useStay } from '@/features/stay/queries/use-stay';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

export function StayScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;

  const stayQuery = useStay(bookingId);

  if (stayQuery.isLoading) {
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

  if (!stayQuery.data) {
    return (
      <Screen>
        <ScreenHeader title={t('stay.title')} />
        <EmptyState title={t('stay.notAvailableTitle')} message={t('stay.notAvailableMessage')} />
      </Screen>
    );
  }

  const { booking, property } = stayQuery.data;

  return (
    <Screen scroll>
      <ScreenHeader title={t('stay.title')} />

      <Card>
        <Text style={styles.unit}>{booking.unitName}</Text>
        <DateRange checkIn={booking.checkIn} checkOut={booking.checkOut} style={styles.dates} />
      </Card>

      <Section title={t('stay.wifiTitle')}>
        <Card>
          <InfoRow label={t('stay.wifiNetwork')} value={property.wifi.network} />
          <Divider />
          <InfoRow label={t('stay.wifiPassword')} value={property.wifi.password} />
        </Card>
      </Section>

      <Section title={t('stay.breakfastTitle')}>
        <Card>
          <Text style={styles.body}>{property.breakfast}</Text>
        </Card>
      </Section>

      <Section title={t('stay.scheduleTitle')}>
        <Card>
          <InfoRow label={t('stay.checkInLabel')} value={property.checkInTime} />
          <Divider />
          <InfoRow label={t('stay.checkOutLabel')} value={property.checkOutTime} />
        </Card>
      </Section>

      <Section title={t('stay.directionsTitle')}>
        <Card>
          <Text style={styles.body}>{property.directions}</Text>
        </Card>
      </Section>

      <Section title={t('stay.contactTitle')}>
        <Card style={styles.contactCard}>
          <ContactActions whatsapp={property.contact.whatsapp} phone={property.contact.phone} />
          <Text style={styles.note}>{t('stay.demoNote')}</Text>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  unit: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  dates: {
    marginTop: spacing.xs,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 21,
  },
  contactCard: {
    gap: spacing.md,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
