import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  CatalogImage,
  EmptyState,
  ErrorState,
  Screen,
  Section,
  Skeleton,
  SkeletonGroup,
} from '@/components';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useCatalog } from '@/features/property/queries/use-property';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const catalogQuery = useCatalog();

  if (catalogQuery.isLoading) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <HomeSkeleton label={t('common.loading')} />
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
        <LanguageSwitch />
        <Text style={styles.tagline} accessibilityRole="header">
          {t('home.title')}
        </Text>
      </View>

      <Button
        title={t('home.searchCta')}
        size="lg"
        fullWidth
        onPress={() => router.push('/search')}
        style={styles.cta}
      />

      <Section title={t('home.propertiesTitle')}>
        <View style={styles.properties}>
          {catalog.map(({ property }) => (
            <Pressable
              key={property.id}
              accessibilityRole="button"
              accessibilityLabel={t('home.viewProperty', { name: property.name })}
              onPress={() =>
                router.push({
                  pathname: '/properties/[propertyId]',
                  params: { propertyId: property.id },
                })
              }
              style={({ pressed }) => [styles.propertyPressable, pressed && styles.pressed]}
            >
              <Card padded={false} style={styles.propertyCard}>
                <CatalogImage image={property.heroImage} height={210} borderRadius={0}>
                  <View style={styles.heroTitleRow}>
                    <Text style={styles.heroTitle}>{property.name}</Text>
                    <Text style={styles.heroArrow}>›</Text>
                  </View>
                  <Text style={styles.heroLocation}>{property.locationLabel}</Text>
                </CatalogImage>
                <Text style={styles.summary}>{property.shortDescription}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

function HomeSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={styles.intro}>
      <Skeleton width="60%" height={28} />
      <Skeleton height={54} borderRadius={radius.md} style={styles.cta} />
      <View style={styles.skeletonCards}>
        {[0, 1].map((key) => (
          <Card key={key} padded={false} style={styles.propertyCard}>
            <Skeleton height={210} borderRadius={0} />
            <View style={styles.skeletonText}>
              <Skeleton height={14} />
              <Skeleton width="70%" height={14} />
            </View>
          </Card>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  skeletonCards: {
    marginTop: spacing.xxl,
    gap: spacing.xxl,
  },
  skeletonText: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    flex: 1,
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
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroArrow: {
    color: colors.white,
    fontSize: fontSize.xxxl,
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
  properties: {
    gap: spacing.xxl,
  },
  propertyPressable: {
    borderRadius: radius.lg,
  },
  propertyCard: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  summary: {
    padding: spacing.lg,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 21,
  },
});
