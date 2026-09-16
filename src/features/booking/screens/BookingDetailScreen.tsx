import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  DateRange,
  Divider,
  EmptyState,
  ErrorState,
  InfoRow,
  LoadingState,
  PriceText,
  Screen,
  ScreenHeader,
  Section,
} from '@/components';
import { ContactActions } from '@/components/ContactActions';
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge';
import { useBooking, useCancelBooking } from '@/features/booking/queries/use-booking';
import type { Booking } from '@/features/booking/types';
import { useProperty } from '@/features/property/queries/use-property';
import type { Property } from '@/features/property/types';
import { formatInstant } from '@/lib/dates';
import { formatCancellationDeadline, isCancellationEligible } from '@/lib/dates/cancellation';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

function StatusMessage({ booking }: { booking: Booking }) {
  const { t } = useTranslation();
  if (booking.status === 'CONFIRMED') {
    return <Text style={styles.statusMessage}>{t('bookings.confirmedMessage')}</Text>;
  }
  if (booking.status === 'PENDING_PAYMENT') {
    return <Text style={styles.statusMessage}>{t('bookings.pendingMessage')}</Text>;
  }
  if (booking.status === 'CANCELED') {
    return <Text style={styles.statusMessage}>{t('bookings.canceledMessage')}</Text>;
  }
  return <Text style={styles.statusMessage}>{t('bookings.refundedMessage')}</Text>;
}

export function BookingDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;

  const bookingQuery = useBooking(bookingId);
  const propertyQuery = useProperty();
  const cancelBooking = useCancelBooking();

  if (bookingQuery.isLoading || propertyQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('bookings.detailTitle')} />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (bookingQuery.isError) {
    return (
      <Screen>
        <ScreenHeader title={t('bookings.detailTitle')} />
        <ErrorState
          title={t('error.title')}
          message={bookingQuery.error ? t(getErrorCode(bookingQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void bookingQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!bookingQuery.data) {
    return (
      <Screen>
        <ScreenHeader title={t('bookings.detailTitle')} />
        <EmptyState title={t('bookings.notFoundTitle')} message={t('bookings.notFoundMessage')} />
      </Screen>
    );
  }

  const booking = bookingQuery.data;
  const property: Property | undefined = propertyQuery.data;

  const eligible =
    booking.status === 'CONFIRMED' && property
      ? isCancellationEligible({
          checkIn: booking.checkIn,
          checkInTime: property.checkInTime,
          timeZone: property.timezone,
        })
      : false;

  const handleCancel = () => {
    Alert.alert(t('bookings.cancelConfirmTitle'), t('bookings.cancelConfirmMessage'), [
      { text: t('bookings.cancelConfirmDismiss'), style: 'cancel' },
      {
        text: t('bookings.cancelConfirmAction'),
        style: 'destructive',
        onPress: () =>
          cancelBooking.mutate(booking.id, {
            onSuccess: () =>
              Alert.alert(t('bookings.detailTitle'), t('bookings.cancelSuccessMessage')),
          }),
      },
    ]);
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('bookings.detailTitle')} />

      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.unit}>{booking.unitName}</Text>
          <BookingStatusBadge status={booking.status} />
        </View>
        <StatusMessage booking={booking} />
        <Divider spaced />
        <InfoRow
          label={t('bookings.datesLabel')}
          value=""
          valueNode={<DateRange checkIn={booking.checkIn} checkOut={booking.checkOut} />}
        />
        <InfoRow label={t('bookings.nightsLabel')} value={String(booking.nights)} />
        <InfoRow label={t('bookings.guestsLabel')} value={String(booking.guestCount)} />
        <InfoRow
          label={t('bookings.rateLabel')}
          value=""
          valueNode={
            <PriceText
              amountMinor={booking.nightlyRateMinor}
              currency={booking.currency}
              size="sm"
            />
          }
        />
        <Divider spaced />
        <InfoRow
          label={t('bookings.totalLabel')}
          value=""
          valueNode={
            <PriceText
              amountMinor={booking.totalAmountMinor}
              currency={booking.currency}
              size="md"
            />
          }
        />
      </Card>

      <Section title={t('booking.guestTitle')}>
        <Card>
          <InfoRow label={t('bookings.guestLabel')} value={booking.guestName} />
          <InfoRow label={t('bookings.emailLabel')} value={booking.guestEmail} />
          {booking.guestPhone ? (
            <InfoRow label={t('bookings.phoneLabel')} value={booking.guestPhone} />
          ) : null}
          <InfoRow
            label={t('bookings.createdLabel')}
            value={formatInstant(booking.createdAt, i18n.language)}
          />
          {booking.status === 'PENDING_PAYMENT' ? (
            <InfoRow
              label={t('bookings.holdLabel')}
              value={formatInstant(booking.holdExpiresAt, i18n.language)}
            />
          ) : null}
          {booking.cancellationReason ? (
            <InfoRow
              label={t('bookings.cancellationReasonLabel')}
              value={t(`booking.cancellationReason.${booking.cancellationReason}`)}
            />
          ) : null}
        </Card>
      </Section>

      {booking.status === 'CONFIRMED' ? (
        <Section title={t('bookings.cancellationTitle')}>
          {!property ? (
            <Card>
              <Text style={styles.statusMessage}>{t('error.title')}</Text>
              <Button
                title={t('common.retry')}
                variant="ghost"
                onPress={() => void propertyQuery.refetch()}
                style={styles.sectionAction}
              />
            </Card>
          ) : eligible ? (
            <Card style={styles.actionsCard}>
              <Text style={styles.deadline}>
                {t('bookings.cancelDeadline', {
                  date: formatCancellationDeadline(
                    booking.checkIn,
                    property.checkInTime,
                    i18n.language,
                  ),
                })}
              </Text>
              {cancelBooking.isError ? (
                <Text style={styles.errorText}>{t(getErrorCode(cancelBooking.error))}</Text>
              ) : null}
              <Button
                title={
                  cancelBooking.isPending ? t('bookings.cancelingCta') : t('bookings.cancelCta')
                }
                variant="danger"
                fullWidth
                loading={cancelBooking.isPending}
                disabled={cancelBooking.isPending}
                onPress={handleCancel}
              />
            </Card>
          ) : (
            <Card style={styles.actionsCard}>
              <Text style={styles.notAllowedTitle}>{t('bookings.cancelNotAllowedTitle')}</Text>
              <Text style={styles.statusMessage}>{t('bookings.cancelNotAllowedMessage')}</Text>
              <Text style={styles.contactLabel}>{t('bookings.contactProperty')}</Text>
              <ContactActions whatsapp={property.contact.whatsapp} phone={property.contact.phone} />
            </Card>
          )}
        </Section>
      ) : null}

      {booking.status === 'CONFIRMED' ? (
        <View style={styles.footer}>
          <Button
            title={t('bookings.stayCta')}
            variant="secondary"
            fullWidth
            onPress={() =>
              router.push({ pathname: '/stay/[bookingId]', params: { bookingId: booking.id } })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  unit: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  statusMessage: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actionsCard: {
    gap: spacing.md,
  },
  deadline: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  notAllowedTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.warning,
  },
  contactLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  sectionAction: {
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
