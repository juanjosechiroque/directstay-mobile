import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  MockImage,
  Screen,
  Section,
} from '@/components';
import { PropertyHighlights } from '@/features/property/components/PropertyHighlights';
import { UnitCard } from '@/features/property/components/UnitCard';
import { useProperty, useUnits } from '@/features/property/queries/use-property';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const propertyQuery = useProperty();
  const unitsQuery = useUnits();

  const retry = () => {
    void propertyQuery.refetch();
    void unitsQuery.refetch();
  };

  if (propertyQuery.isLoading) {
    return (
      <Screen scroll>
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (propertyQuery.isError || !propertyQuery.data) {
    return (
      <Screen scroll>
        <ErrorState
          title={t('error.title')}
          message={propertyQuery.error ? t(getErrorCode(propertyQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={retry}
        />
      </Screen>
    );
  }

  const property = propertyQuery.data;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <MockImage image={property.heroImage} height={280} borderRadius={24}>
        <Text style={styles.heroEyebrow}>{t('home.eyebrow')}</Text>
        <Text style={styles.heroTitle}>{property.name}</Text>
        <Text style={styles.heroLocation}>{property.locationLabel}</Text>
      </MockImage>

      <View style={styles.intro}>
        <Text style={styles.tagline}>{t('home.title')}</Text>
        <Text style={styles.description}>{property.shortDescription}</Text>
      </View>

      <Button
        title={t('home.searchCta')}
        size="lg"
        fullWidth
        onPress={() => router.push('/search')}
        style={styles.cta}
      />

      <PropertyHighlights highlights={property.highlights} description={property.description} />

      <Section title={t('home.featuredTitle')} subtitle={t('home.featuredSubtitle')}>
        {unitsQuery.isLoading ? <LoadingState /> : null}
        {unitsQuery.isError ? (
          <ErrorState
            title={t('error.title')}
            message={unitsQuery.error ? t(getErrorCode(unitsQuery.error)) : undefined}
            retryLabel={t('common.retry')}
            onRetry={retry}
          />
        ) : null}
        {unitsQuery.isSuccess && unitsQuery.data.length === 0 ? (
          <EmptyState title={t('search.noResultsTitle')} message={t('search.noResultsMessage')} />
        ) : null}
        {unitsQuery.data?.length ? (
          <View style={styles.units}>
            {unitsQuery.data.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onPress={() =>
                  router.push({ pathname: '/units/[unitId]', params: { unitId: unit.id } })
                }
              />
            ))}
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  heroEyebrow: {
    color: '#F2E9D8',
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.white,
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  heroLocation: {
    color: '#EDE4D3',
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  intro: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 24,
  },
  cta: {
    marginTop: spacing.lg,
  },
  units: {
    gap: spacing.lg,
  },
});
