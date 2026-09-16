import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Screen, ScreenHeader, TextField } from '@/components';
import { QuoteSummary } from '@/features/booking/components/QuoteSummary';
import { useBookingDraft } from '@/features/booking/draft/booking-draft-context';
import { useBookingQuote } from '@/features/booking/queries/use-booking-quote';
import { colors, fontSize, spacing } from '@/lib/theme';
import { hasErrors, validateGuestForm, type GuestFormErrors } from '@/lib/validation';

export function BookingGuestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stay, guest, setGuest } = useBookingDraft();

  // Reuse any previously entered guest data (e.g. coming back from payment).
  const [fullName, setFullName] = useState(guest?.fullName ?? '');
  const [email, setEmail] = useState(guest?.email ?? '');
  const [phone, setPhone] = useState(guest?.phone ?? '');
  const [errors, setErrors] = useState<GuestFormErrors>({});

  const quoteState = useBookingQuote(
    stay
      ? {
          unitId: stay.unitId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guestCount: stay.guestCount,
        }
      : null,
  );

  if (!stay) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.guestTitle')} />
        <EmptyState
          title={t('booking.draftMissingTitle')}
          message={t('booking.draftMissingMessage')}
        />
        <Button title={t('booking.goToSearch')} onPress={() => router.replace('/search')} />
      </Screen>
    );
  }

  const handleSubmit = () => {
    const nextErrors = validateGuestForm({ fullName, email, phone });
    setErrors(nextErrors);
    if (hasErrors(nextErrors) || !quoteState.isReady) {
      return;
    }
    setGuest({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });
    router.push('/booking/payment');
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('booking.guestTitle')} />
      <Text style={styles.subtitle}>{t('booking.guestSubtitle')}</Text>

      <Card style={styles.form}>
        <TextField
          label={t('booking.fullName')}
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
          error={errors.fullName ? t(errors.fullName) : undefined}
          required
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />
        <TextField
          label={t('booking.email')}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email ? t(errors.email) : undefined}
          required
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label={`${t('booking.phone')} (${t('booking.phoneOptional')})`}
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setErrors((current) => ({ ...current, phone: undefined }));
          }}
          error={errors.phone ? t(errors.phone) : undefined}
          helper={t('booking.phoneHelper')}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="done"
        />
      </Card>

      <View style={styles.quote}>
        <QuoteSummary state={quoteState} />
      </View>

      <View style={styles.footer}>
        <Button
          title={t('booking.guestContinueCta')}
          size="lg"
          fullWidth
          disabled={!quoteState.isReady}
          onPress={handleSubmit}
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
  quote: {
    marginTop: spacing.xl,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
