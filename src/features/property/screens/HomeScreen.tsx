import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  CatalogImage,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Section,
} from '@/components';
import { PropertyHighlights } from '@/features/property/components/PropertyHighlights';
import { UnitCard } from '@/features/property/components/UnitCard';
import { useCatalog } from '@/features/property/queries/use-property';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const catalogQuery = useCatalog();

  if (catalogQuery.isLoading) {
    return (
      <Screen scroll>
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <Screen scroll>
        <ErrorState
          title={t('error.title')}
          message={catalogQuery.error ? t(getErrorCode(catalogQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void catalogQuery.refetch()}
        />
      </Screen>
    );
  }

  const catalog = catalogQuery.data;

  if (catalog.length === 0) {
    return (
      <Screen scroll>
        <EmptyState title={t('home.emptyTitle')} message={t('home.emptyMessage')} />
      </Screen>
    );
  }

  const primary = catalog[0].property;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <CatalogImage image={primary.heroImage} height={280} borderRadius={24}>
        <Text style={styles.heroEyebrow}>{t('home.eyebrow')}</Text>
        <Text style={styles.heroTitle}>{primary.name}</Text>
        <Text style={styles.heroLocation}>{primary.locationLabel}</Text>
      </CatalogImage>

      <View style={styles.intro}>
        <Text style={styles.tagline}>{t('home.title')}</Text>
        <Text style={styles.description}>{primary.shortDescription}</Text>
      </View>

      <Button
        title={t('home.searchCta')}
        size="lg"
        fullWidth
        onPress={() => router.push('/search')}
        style={styles.cta}
      />

      <PropertyHighlights highlights={primary.highlights} description={primary.description} />

      {catalog.map(({ property, units }) => (
        <Section key={property.id} spaced title={property.name} subtitle={property.locationLabel}>
          {units.length ? (
            <View style={styles.units}>
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onPress={() =>
                    router.push({ pathname: '/units/[unitId]', params: { unitId: unit.id } })
                  }
                />
              ))}
            </View>
          ) : (
            <EmptyState title={t('search.noResultsTitle')} message={t('search.noResultsMessage')} />
          )}
        </Section>
      ))}
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
