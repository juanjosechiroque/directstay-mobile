import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  CatalogImage,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  Section,
} from '@/components';
import { ContactActions } from '@/components/ContactActions';
import { PropertyHighlights } from '@/features/property/components/PropertyHighlights';
import { UnitCard } from '@/features/property/components/UnitCard';
import { useCatalog } from '@/features/property/queries/use-property';
import { getErrorCode } from '@/lib/errors';
import { useAnnounce } from '@/lib/use-announce';
import { colors, fontSize, spacing } from '@/lib/theme';

export function PropertyDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const catalogQuery = useCatalog();
  const [mapError, setMapError] = useState(false);
  useAnnounce(mapError ? t('common.linkUnavailable') : undefined);
  const selectedPropertyId = typeof propertyId === 'string' ? propertyId : undefined;

  if (catalogQuery.isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  if (catalogQuery.isError) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorState
          title={t('error.title')}
          message={catalogQuery.error ? t(getErrorCode(catalogQuery.error)) : undefined}
          retryLabel={t('common.retry')}
          onRetry={() => void catalogQuery.refetch()}
        />
      </Screen>
    );
  }

  const entry = catalogQuery.data?.find(({ property }) => property.id === selectedPropertyId);
  if (!entry) {
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState title={t('property.notFoundTitle')} message={t('property.notFoundMessage')} />
      </Screen>
    );
  }

  const { property, units } = entry;
  const address = property.mapReference ?? property.locationLabel;
  const openMap = async () => {
    if (!address) return;
    setMapError(false);
    try {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      );
    } catch {
      setMapError(true);
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader />
      <CatalogImage image={property.heroImage} height={240} borderRadius={24}>
        <Text style={styles.heroTitle}>{property.name}</Text>
        <Text style={styles.heroLocation}>{property.locationLabel}</Text>
      </CatalogImage>

      <View style={styles.details}>
        <PropertyHighlights highlights={property.highlights} description={property.description} />
        <Button
          title={t('property.searchCta')}
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/search', params: { propertyId: property.id } })}
        />
      </View>

      {address ? (
        <Section title={t('property.locationTitle')}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('property.openMapAccessibility', { address })}
            onPress={() => void openMap()}
            style={({ pressed }) => [styles.addressLink, pressed && styles.pressed]}
          >
            <Text style={styles.address}>{address}</Text>
            <Text style={styles.mapLink}>{t('property.openMap')}</Text>
          </Pressable>
          {mapError ? <Text style={styles.mapError}>{t('common.linkUnavailable')}</Text> : null}
        </Section>
      ) : null}

      {property.contact.phone || property.contact.whatsapp ? (
        <Section title={t('property.contactTitle')}>
          <View style={styles.contact}>
            {property.contact.phone ? (
              <Text style={styles.phone}>
                {t('property.phoneLabel')}: {property.contact.phone}
              </Text>
            ) : null}
            <ContactActions
              whatsapp={property.contact.whatsapp}
              phone={property.contact.phone}
              propertyName={property.name}
            />
          </View>
        </Section>
      ) : null}

      <Section title={t('property.unitsTitle')}>
        {units.length > 0 ? (
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
          <EmptyState title={t('property.noUnitsTitle')} message={t('property.noUnitsMessage')} />
        )}
      </Section>
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
  },
  heroLocation: {
    color: '#EDE4D3',
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  details: {
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  addressLink: { minHeight: 48, justifyContent: 'center', gap: spacing.xs },
  address: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  mapLink: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  mapError: { color: colors.danger, fontSize: fontSize.sm },
  pressed: { opacity: 0.7 },
  contact: { gap: spacing.sm },
  phone: { color: colors.text, fontSize: fontSize.md },
  units: {
    gap: spacing.lg,
  },
});
