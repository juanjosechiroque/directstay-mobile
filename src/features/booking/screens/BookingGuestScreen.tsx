import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  TextField,
} from '@/components';
import { QuoteSummary } from '@/features/booking/components/QuoteSummary';
import { useBookingDraft } from '@/features/booking/draft/booking-draft-context';
import { useBookingQuote } from '@/features/booking/queries/use-booking';
import { useCreateBooking } from '@/features/booking/queries/use-booking-mutations';
import { useAuthActions } from '@/features/auth/queries/use-session';
import { getErrorCode } from '@/lib/errors';
import { buildInternationalPhone } from '@/lib/phone';
import { colors, fontSize, spacing } from '@/lib/theme';
import { hasErrors, validateGuestForm, type GuestFormErrors } from '@/lib/validation';
import { PhoneNumberField } from '@/features/booking/components/PhoneNumberField';

export function BookingGuestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stay, guest, setGuest } = useBookingDraft();
  const { ensureGuestSession } = useAuthActions();
  const createBooking = useCreateBooking();
  const submitLock = useRef(false);

  // Reuse any previously entered guest data (e.g. coming back from payment).
  const [fullName, setFullName] = useState(guest?.fullName ?? '');
  const [email, setEmail] = useState(guest?.email ?? '');
  const [phoneCountryCode, setPhoneCountryCode] = useState(guest?.phoneCountryCode ?? '51');
  const [phoneLocalNumber, setPhoneLocalNumber] = useState(guest?.phoneLocalNumber ?? '');
  const [specialRequests, setSpecialRequests] = useState(guest?.specialRequests ?? '');
  const [errors, setErrors] = useState<GuestFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

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

  const handleSubmit = async () => {
    if (submitLock.current) return;
    const phone = buildInternationalPhone(phoneCountryCode, phoneLocalNumber);
    const nextErrors = validateGuestForm({ fullName, email, phone });
    setErrors(nextErrors);
    if (hasErrors(nextErrors) || !quoteState.isReady) {
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setGuest({
      fullName: fullName.trim(),
      email: email.trim(),
      phoneCountryCode,
      phoneLocalNumber,
      specialRequests: specialRequests.trim(),
    });
    try {
      await ensureGuestSession();
      const created = await createBooking.mutateAsync({
        unitId: stay.unitId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guestCount: stay.guestCount,
        guestName: fullName.trim(),
        guestEmail: email.trim(),
        guestPhone: phone || null,
        specialRequests: specialRequests.trim() || null,
      });
      router.push({ pathname: '/booking/payment', params: { bookingId: created.id } });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
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
        <PhoneNumberField
          countryCode={phoneCountryCode}
          localNumber={phoneLocalNumber}
          onCountryCodeChange={(code) => {
            setPhoneCountryCode(code);
            setErrors((current) => ({ ...current, phone: undefined }));
          }}
          onLocalNumberChange={(number) => {
            setPhoneLocalNumber(number);
            setErrors((current) => ({ ...current, phone: undefined }));
          }}
          error={errors.phone ? t(errors.phone) : undefined}
        />
        <TextField
          label={t('booking.specialRequests')}
          value={specialRequests}
          onChangeText={setSpecialRequests}
          helper={t('booking.specialRequestsHelper')}
          multiline
          maxLength={500}
          textAlignVertical="top"
          style={styles.requestsInput}
        />
      </Card>

      <Text style={styles.privacyNote}>{t('booking.guestPrivacyNote')}</Text>

      {submitError ? (
        <ErrorState
          title={t('booking.creationErrorTitle')}
          message={t(getErrorCode(submitError))}
          retryLabel={t('common.retry')}
          onRetry={() => void handleSubmit()}
        />
      ) : null}

      {submitError && getErrorCode(submitError) === 'error.unavailable' ? (
        <Button title={t('booking.goToSearch')} onPress={() => router.replace('/search')} />
      ) : null}

      <View style={styles.quote}>
        <QuoteSummary state={quoteState} />
      </View>

      <View style={styles.footer}>
        <Button
          title={t('booking.guestContinueCta')}
          size="lg"
          fullWidth
          disabled={!quoteState.isReady || submitting}
          loading={submitting}
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
  requestsInput: {
    minHeight: 96,
  },
  privacyNote: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  quote: {
    marginTop: spacing.xl,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
