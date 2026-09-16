import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, PriceText, Screen, ScreenHeader, TextField } from '@/components';
import { useQuote } from '@/features/booking/queries/use-booking';
import { colors, fontSize, spacing } from '@/lib/theme';
import {
  hasErrors,
  toIsoDateParam,
  toPositiveIntParam,
  validateGuestForm,
  type GuestFormErrors,
} from '@/lib/validation';

export function BookingGuestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    unitId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>();

  const unitId = typeof params.unitId === 'string' ? params.unitId : undefined;
  const checkIn = toIsoDateParam(params.checkIn);
  const checkOut = toIsoDateParam(params.checkOut);
  const guests = toPositiveIntParam(params.guests);

  const quoteQuery = useQuote(
    unitId && checkIn && checkOut && guests
      ? { unitId, checkIn, checkOut, guestCount: guests }
      : null,
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<GuestFormErrors>({});

  if (!unitId || !checkIn || !checkOut || !guests) {
    return (
      <Screen>
        <ScreenHeader title={t('booking.guestTitle')} />
        <EmptyState title={t('error.title')} message={t('error.validation')} />
      </Screen>
    );
  }

  const handleSubmit = () => {
    const nextErrors = validateGuestForm({ fullName, email, phone });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      return;
    }
    router.push({
      pathname: '/booking/payment',
      params: { unitId, checkIn, checkOut, guests: String(guests), fullName, email, phone },
    });
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

      {quoteQuery.data ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('booking.totalLabel')}</Text>
          <PriceText
            amountMinor={quoteQuery.data.totalAmountMinor}
            currency={quoteQuery.data.currency}
          />
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button title={t('booking.guestContinueCta')} size="lg" fullWidth onPress={handleSubmit} />
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
