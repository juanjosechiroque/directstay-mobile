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

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.tagline}>{t('home.title')}</Text>
      </View>

      <Button
        title={t('home.searchCta')}
        size="lg"
        fullWidth
        onPress={() => router.push('/search')}
        style={styles.cta}
      />

      {/* Every property gets its own hero image, description and unit list — no single
          property is treated as "the" featured one. */}
      {catalog.map(({ property, units }) => (
        <View key={property.id} style={styles.propertyBlock}>
          <CatalogImage image={property.heroImage} height={220} borderRadius={24}>
            <Text style={styles.heroTitle}>{property.name}</Text>
            <Text style={styles.heroLocation}>{property.locationLabel}</Text>
          </CatalogImage>

          <PropertyHighlights highlights={property.highlights} description={property.description} />

          <Section spaced title={t('home.unitsTitle')}>
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
              <EmptyState
                title={t('search.noResultsTitle')}
                message={t('search.noResultsMessage')}
              />
            )}
          </Section>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
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
  cta: {
    marginTop: spacing.lg,
  },
  propertyBlock: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  units: {
    gap: spacing.lg,
  },
});
