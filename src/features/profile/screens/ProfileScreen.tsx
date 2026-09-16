import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorState, InfoRow, LoadingState, Screen, Section } from '@/components';
import { LanguageSwitch } from '@/features/profile/components/LanguageSwitch';
import { useProfile } from '@/features/profile/queries/use-profile';
import { useAuthActions, useSession } from '@/features/auth/queries/use-session';
import { useSessionGuard } from '@/features/auth/guards/use-session-guard';
import { formatIsoDate } from '@/lib/dates';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const guard = useSessionGuard('/profile');
  const profileQuery = useProfile();
  const { user } = useSession();
  const { signOut } = useAuthActions();
  const profile = profileQuery.data;

  if (guard !== 'signedIn') {
    return (
      <Screen scroll>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('profile.title')}</Text>
      <Text style={styles.subtitle}>{t('profile.accountSubtitle')}</Text>

      {profileQuery.isLoading ? <LoadingState message={t('common.loading')} /> : null}

      {profileQuery.isError || (!profileQuery.isLoading && !profile) ? (
        <Card>
          <ErrorState
            title={t('error.title')}
            message={profileQuery.error ? t(getErrorCode(profileQuery.error)) : undefined}
            retryLabel={t('common.retry')}
            onRetry={() => void profileQuery.refetch()}
          />
        </Card>
      ) : null}

      {profile ? (
        <Card>
          <InfoRow label={t('profile.nameLabel')} value={profile.displayName} />
          <InfoRow label={t('profile.emailLabel')} value={profile.email || user?.email || ''} />
          {profile.phone ? <InfoRow label={t('profile.phoneLabel')} value={profile.phone} /> : null}
          {profile.memberSince ? (
            <InfoRow
              label={t('profile.memberSinceLabel')}
              value={formatIsoDate(profile.memberSince, i18n.language)}
            />
          ) : null}
        </Card>
      ) : null}

      <Section title={t('profile.languageTitle')}>
        <LanguageSwitch />
      </Section>

      <Section title={t('profile.sessionTitle')}>
        <View style={styles.session}>
          <Button
            title={t('auth.signOutCta')}
            variant="danger"
            fullWidth
            onPress={() => void signOut()}
          />
        </View>
      </Section>

      <Section title={t('profile.aboutTitle')}>
        <Card>
          <Text style={styles.aboutLine}>
            {t('profile.aboutVersion', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </Text>
          <Text style={styles.aboutMuted}>{t('profile.aboutStack')}</Text>
        </Card>
      </Section>
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
  session: {
    gap: spacing.md,
  },
  aboutLine: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  aboutMuted: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
