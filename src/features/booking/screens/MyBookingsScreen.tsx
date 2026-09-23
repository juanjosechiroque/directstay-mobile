import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components';
import { BookingCard } from '@/features/booking/components/BookingCard';
import { useBookings } from '@/features/booking/queries/use-booking';
import { useSession } from '@/features/auth/queries/use-session';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

export function MyBookingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status } = useSession();
  const bookingsQuery = useBookings(status === 'signedIn');

  if (status === 'loading') {
    return (
      <Screen scroll>
        <Text style={styles.title}>{t('bookings.title')}</Text>
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (status === 'signedOut') {
    return (
      <Screen scroll>
        <Text style={styles.title}>{t('bookings.title')}</Text>
        <View style={styles.empty}>
          <EmptyState title={t('bookings.emptyTitle')} message={t('bookings.emptyMessage')} />
          <Button
            title={t('home.searchCta')}
            variant="secondary"
            onPress={() => router.push('/search')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('bookings.title')}</Text>
      <Text style={styles.subtitle}>{t('bookings.subtitle')}</Text>

      {bookingsQuery.isLoading ? <LoadingState message={t('common.loading')} /> : null}

      {bookingsQuery.isError ? (
        <ErrorState
          title={t('bookings.errorTitle')}
          message={bookingsQuery.error ? t(getErrorCode(bookingsQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void bookingsQuery.refetch()}
        />
      ) : null}

      {bookingsQuery.isSuccess && bookingsQuery.data.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState title={t('bookings.emptyTitle')} message={t('bookings.emptyMessage')} />
          <Button
            title={t('home.searchCta')}
            variant="secondary"
            onPress={() => router.push('/search')}
          />
        </View>
      ) : null}

      {bookingsQuery.data?.length ? (
        <View style={styles.list}>
          {bookingsQuery.data.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() =>
                router.push({
                  pathname: '/bookings/[bookingId]',
                  params: { bookingId: booking.id },
                })
              }
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.lg,
  },
  empty: {
    gap: spacing.lg,
  },
});
