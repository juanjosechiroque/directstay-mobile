import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { Card, ErrorState, LoadingState, Screen, Section } from '@/components';
import { ContactActions } from '@/components/ContactActions';
import { LanguageSwitch } from '@/features/settings/components/LanguageSwitch';
import { useCatalog } from '@/features/property/queries/use-property';
import { colors, fontSize, spacing } from '@/lib/theme';

export function SettingsScreen() {
  const { t } = useTranslation();
  const catalogQuery = useCatalog();

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Section title={t('settings.languageTitle')}>
        <LanguageSwitch />
      </Section>

      <Section title={t('settings.contactTitle')}>
        {catalogQuery.isLoading ? <LoadingState message={t('common.loading')} /> : null}
        {catalogQuery.isError ? (
          <Card>
            <ErrorState
              title={t('settings.contactError')}
              retryLabel={t('common.retry')}
              onRetry={() => void catalogQuery.refetch()}
            />
          </Card>
        ) : null}
        {catalogQuery.data?.map(({ property }) => (
          <Card key={property.id} style={styles.contact}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <ContactActions whatsapp={property.contact.whatsapp} phone={property.contact.phone} />
          </Card>
        ))}
      </Section>

      <Section title={t('settings.aboutTitle')}>
        <Card>
          <Text style={styles.version}>
            {t('settings.aboutVersion', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </Text>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  contact: { gap: spacing.md },
  propertyName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  version: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
});
