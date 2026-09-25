import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, Text, View } from 'react-native';

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
import { formatHoldCountdown, remainingHoldSeconds } from '@/features/booking/hold-countdown';
import { useBooking } from '@/features/booking/queries/use-booking';
import type { Booking } from '@/features/booking/types';
import { useSession } from '@/features/auth/queries/use-session';
import { formatInstant } from '@/lib/dates';
import { formatCancellationDeadline, isCancellationEligible } from '@/lib/dates/cancellation';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import { AddStayToCalendarButton } from '@/features/booking/components/AddStayToCalendarButton';

function StatusMessage({ booking, holdExpired }: { booking: Booking; holdExpired: boolean }) {
  const { t } = useTranslation();
  if (booking.status === 'CONFIRMED') {
    return <Text style={styles.statusMessage}>{t('bookings.confirmedMessage')}</Text>;
  }
  if (booking.status === 'PENDING_PAYMENT') {
    return (
      <Text style={styles.statusMessage}>
        {t(holdExpired ? 'bookings.pendingExpiredMessage' : 'bookings.pendingMessage')}
      </Text>
    );
  }
  if (booking.status === 'CANCELED') {
    return <Text style={styles.statusMessage}>{t('bookings.canceledMessage')}</Text>;
  }
  return <Text style={styles.statusMessage}>{t('bookings.refundedMessage')}</Text>;
}

export function BookingDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { status } = useSession();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;

  const bookingQuery = useBooking(status === 'signedIn' ? bookingId : undefined);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Only tick while a live hold countdown is on screen. Confirmed, canceled and refunded
  // bookings show no countdown, so a per-second re-render would be wasted work.
  const bookingData = bookingQuery.data;
  const isHoldTicking =
    bookingData?.status === 'PENDING_PAYMENT' &&
    remainingHoldSeconds(bookingData.holdExpiresAt, nowMs) > 0;

  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') setNowMs(Date.now());
      });
      const timer = isHoldTicking ? setInterval(() => setNowMs(Date.now()), 1000) : null;
      return () => {
        if (timer) clearInterval(timer);
        subscription.remove();
      };
    }, [isHoldTicking]),
  );

  if (status === 'loading' || bookingQuery.isLoading) {
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

  if (status === 'signedOut' || !bookingQuery.data) {
    return (
      <Screen>
        <ScreenHeader title={t('bookings.detailTitle')} />
        <EmptyState title={t('bookings.notFoundTitle')} message={t('bookings.notFoundMessage')} />
      </Screen>
    );
  }

  const booking = bookingQuery.data;
  const pendingSeconds =
    booking.status === 'PENDING_PAYMENT' ? remainingHoldSeconds(booking.holdExpiresAt, nowMs) : 0;
  const holdExpired = booking.status === 'PENDING_PAYMENT' && pendingSeconds === 0;
  const eligible =
    booking.status === 'CONFIRMED' &&
    isCancellationEligible({
      checkIn: booking.checkIn,
      checkInTime: booking.propertyCheckInTime,
      timeZone: booking.propertyTimezone,
    });

  return (
    <Screen scroll>
      <ScreenHeader title={t('bookings.detailTitle')} />

      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.unit}>{booking.unitName}</Text>
          <BookingStatusBadge status={booking.status} />
        </View>
        {booking.propertyName ? <Text style={styles.property}>{booking.propertyName}</Text> : null}
        <StatusMessage booking={booking} holdExpired={holdExpired} />
        {booking.status === 'PENDING_PAYMENT' && !holdExpired ? (
          <Text style={styles.countdown}>
            {t('booking.holdCountdown', { time: formatHoldCountdown(pendingSeconds) })}
          </Text>
        ) : null}
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
          {booking.specialRequests ? (
            <InfoRow label={t('bookings.specialRequestsLabel')} value={booking.specialRequests} />
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
          <Card style={styles.actionsCard}>
            {eligible ? (
              <Text style={styles.deadline}>
                {t('bookings.cancelDeadline', {
                  date: formatCancellationDeadline(
                    booking.checkIn,
                    booking.propertyCheckInTime,
                    i18n.language,
                  ),
                })}
              </Text>
            ) : (
              <>
                <Text style={styles.notAllowedTitle}>{t('bookings.cancelNotAllowedTitle')}</Text>
                <Text style={styles.statusMessage}>{t('bookings.cancelNotAllowedMessage')}</Text>
              </>
            )}
            <Text style={styles.statusMessage}>{t('bookings.cancelNotEnabledMessage')}</Text>
            <Text style={styles.contactLabel}>{t('bookings.contactProperty')}</Text>
            <ContactActions
              whatsapp={booking.propertyWhatsapp}
              phone={booking.propertyPhone}
              propertyName={booking.propertyName}
            />
          </Card>
        </Section>
      ) : null}

      {booking.status === 'PENDING_PAYMENT' ? (
        <View style={styles.footer}>
          {holdExpired ? (
            <Button
              title={t('booking.goToSearch')}
              fullWidth
              onPress={() => router.push('/search')}
            />
          ) : (
            <Button
              title={t('booking.demoPayCta')}
              fullWidth
              onPress={() =>
                router.push({ pathname: '/booking/payment', params: { bookingId: booking.id } })
              }
            />
          )}
        </View>
      ) : null}

      {booking.status === 'CONFIRMED' ? (
        <View style={styles.footer}>
          <AddStayToCalendarButton booking={booking} />
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
  property: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statusMessage: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  countdown: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
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
  footer: {
    marginTop: spacing.xl,
  },
});
