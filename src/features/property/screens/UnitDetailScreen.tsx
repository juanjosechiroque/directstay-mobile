import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  MockImage,
  PriceText,
  Screen,
  ScreenHeader,
  Section,
} from '@/components';
import { useUnit } from '@/features/property/queries/use-property';
import type { AmenityCode } from '@/features/property/types';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, radius, shadows, spacing } from '@/lib/theme';
import { toPositiveIntParam } from '@/lib/validation';

export function UnitDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    unitId: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>();

  const unitId = typeof params.unitId === 'string' ? params.unitId : undefined;
  const unitQuery = useUnit(unitId);
  const checkIn = typeof params.checkIn === 'string' ? params.checkIn : undefined;
  const checkOut = typeof params.checkOut === 'string' ? params.checkOut : undefined;
  const guests = toPositiveIntParam(params.guests);

  const galleryWidth = Math.min(width - spacing.lg * 2, 420);

  const handleBook = () => {
    if (!unitId) {
      return;
    }
    if (checkIn && checkOut && guests) {
      router.push({
        pathname: '/booking/review',
        params: { unitId, checkIn, checkOut, guests: String(guests) },
      });
      return;
    }
    router.push('/search');
  };

  if (unitQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (unitQuery.isError) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorState
          title={t('error.title')}
          message={unitQuery.error ? t(getErrorCode(unitQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void unitQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!unitQuery.data) {
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState title={t('unit.notFoundTitle')} message={t('unit.notFoundMessage')} />
      </Screen>
    );
  }

  const unit = unitQuery.data;

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <ScreenHeader />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={galleryWidth + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.gallery}
      >
        {unit.images.map((image, index) => (
          <MockImage
            key={image.id}
            image={image}
            height={240}
            borderRadius={radius.lg}
            style={{ width: galleryWidth }}
          >
            <Text style={styles.galleryCaption}>
              {t('unit.imageAlt', { name: unit.name, index: index + 1 })}
            </Text>
          </MockImage>
        ))}
      </ScrollView>

      <View style={styles.content}>
        <Text style={styles.name}>{unit.name}</Text>
        <Text style={styles.summary}>{unit.summary}</Text>

        <View style={styles.badges}>
          <Badge label={t('unit.maxGuests', { count: unit.maxGuests })} tone="info" />
        </View>

        <Card style={styles.priceCard}>
          <PriceText amountMinor={unit.nightlyRateMinor} currency={unit.currency} size="lg" />
          <Text style={styles.perNight}>{t('unit.perNight')}</Text>
        </Card>

        <Section title={t('unit.descriptionTitle')} spaced>
          <Text style={styles.description}>{unit.description}</Text>
        </Section>

        <Section title={t('unit.amenitiesTitle')}>
          <View style={styles.amenities}>
            {unit.amenities.map((amenity: AmenityCode) => (
              <View key={amenity} style={styles.amenity}>
                <Text style={styles.amenityDot}>•</Text>
                <Text style={styles.amenityLabel}>{t(`amenities.${amenity}`)}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Button
          title={t('unit.continueCta')}
          size="lg"
          fullWidth
          onPress={handleBook}
          style={styles.cta}
        />
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          style={styles.secondaryLink}
        >
          <Text style={styles.secondaryLinkText}>{t('search.changeSearch')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  gallery: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  galleryCaption: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  name: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.text,
  },
  summary: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  perNight: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 23,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '48%',
  },
  amenityDot: {
    color: colors.accent,
    fontSize: fontSize.md,
  },
  amenityLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    flexShrink: 1,
  },
  cta: {
    marginTop: spacing.xxl,
  },
  secondaryLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  secondaryLinkText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
