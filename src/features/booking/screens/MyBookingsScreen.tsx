import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Skeleton,
  SkeletonGroup,
} from '@/components';
import { BookingCard } from '@/features/booking/components/BookingCard';
import { useBookings } from '@/features/booking/queries/use-booking';
import { useSession } from '@/features/auth/queries/use-session';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

function BookingsSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={styles.list}>
      {[0, 1, 2].map((key) => (
        <Card key={key} style={styles.skeletonCard}>
          <Skeleton width="55%" height={20} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={14} />
        </Card>
      ))}
    </SkeletonGroup>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function MyBookingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status } = useSession();
  const bookingsQuery = useBookings(status === 'signedIn');
  const [refreshing, setRefreshing] = useState(false);

  if (status === 'loading') {
    return (
      <Screen scroll>
        <Text style={styles.title} accessibilityRole="header">
          {t('bookings.title')}
        </Text>
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  const emptyState = (
    <View style={styles.empty}>
      <EmptyState title={t('bookings.emptyTitle')} message={t('bookings.emptyMessage')} />
      <Button
        title={t('home.searchCta')}
        variant="secondary"
        onPress={() => router.push('/search')}
      />
    </View>
  );

  if (status === 'signedOut') {
    return (
      <Screen scroll>
        <Text style={styles.title} accessibilityRole="header">
          {t('bookings.title')}
        </Text>
        {emptyState}
      </Screen>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await bookingsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <FlatList
        testID="my-bookings-list"
        data={bookingsQuery.data ?? []}
        keyExtractor={(booking) => booking.id}
        // renderItem/keyExtractor stay inline: the React Compiler memoizes them, so a manual
        // useCallback would add noise without a measured gain (see docs/PERFORMANCE.md).
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() =>
              router.push({
                pathname: '/bookings/[bookingId]',
                params: { bookingId: item.id },
              })
            }
          />
        )}
        ItemSeparatorComponent={ItemSeparator}
        // The list only grows with the user's own bookings; tune the render window so a large
        // history does not mount everything at once.
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title} accessibilityRole="header">
              {t('bookings.title')}
            </Text>
            <Text style={styles.subtitle}>{t('bookings.subtitle')}</Text>
            {bookingsQuery.isError && bookingsQuery.data?.length ? (
              <ErrorState
                title={t('bookings.errorTitle')}
                message={t(getErrorCode(bookingsQuery.error))}
                retryLabel={t('common.retry')}
                onRetry={() => void bookingsQuery.refetch()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          bookingsQuery.isLoading ? (
            <BookingsSkeleton label={t('common.loading')} />
          ) : bookingsQuery.isError ? (
            <ErrorState
              title={t('bookings.errorTitle')}
              message={t(getErrorCode(bookingsQuery.error))}
              retryLabel={t('common.retry')}
              onRetry={() => void bookingsQuery.refetch()}
            />
          ) : (
            emptyState
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
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
  separator: {
    height: spacing.lg,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  empty: {
    gap: spacing.lg,
  },
});
