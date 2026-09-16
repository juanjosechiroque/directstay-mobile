import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, ScreenHeader, TextField } from '@/components';
import { useAuthActions } from '@/features/auth/queries/use-session';
import { sanitizeRedirect } from '@/features/auth/session/redirect';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';

/** Email + password sign-in. The catalog stays reachable without ever opening this screen. */
export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = sanitizeRedirect(params.redirect);
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setErrorCode('validation.authCredentialsRequired');
      return;
    }
    setSubmitting(true);
    setErrorCode(null);
    try {
      await signIn({ email, password });
      router.replace(redirect as Href);
    } catch (error) {
      setErrorCode(getErrorCode(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('auth.loginTitle')} />
      <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

      <Card style={styles.form}>
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorCode(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          required
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrorCode(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          required
        />
        {errorCode ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {t(errorCode)}
          </Text>
        ) : null}
      </Card>

      <View style={styles.footer}>
        <Button
          title={submitting ? t('auth.signingInCta') : t('auth.signInCta')}
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting}
          onPress={() => void handleSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
