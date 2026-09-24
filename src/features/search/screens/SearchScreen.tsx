import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  Section,
} from '@/components';
import { UnitCard } from '@/features/property/components/UnitCard';
import { DateField } from '@/features/search/components/DateField';
import { GuestCounter } from '@/features/search/components/GuestCounter';
import { useCatalog } from '@/features/property/queries/use-property';
import { useAvailabilitySearch } from '@/features/search/queries/use-availability-search';
import type { AvailabilityQuery } from '@/features/search/types';
import { addDays, todayIso, todayIsoInTimeZone, type IsoDate } from '@/lib/dates';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { hasErrors, validateSearchCriteria, type SearchCriteriaErrors } from '@/lib/validation';

export function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const catalogQuery = useCatalog();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [propertyId, setPropertyId] = useState<string | null>(
    typeof params.propertyId === 'string' ? params.propertyId : null,
  );
  const [propertyError, setPropertyError] = useState(false);
  const [checkIn, setCheckIn] = useState<IsoDate | null>(null);
  const [checkOut, setCheckOut] = useState<IsoDate | null>(null);
  const [guests, setGuests] = useState(2);
  const [errors, setErrors] = useState<SearchCriteriaErrors>({});
  const [criteria, setCriteria] = useState<AvailabilityQuery | null>(null);

  const selectedEntry = catalogQuery.data?.find(({ property }) => property.id === propertyId);
  const maxGuests = selectedEntry
    ? Math.max(1, ...selectedEntry.units.map((unit) => unit.maxGuests))
    : undefined;
  const selectedGuests = maxGuests ? Math.min(guests, maxGuests) : guests;
  const now = new Date(nowMs);
  const today = selectedEntry
    ? todayIsoInTimeZone(selectedEntry.property.timezone, now)
    : todayIso(now);
  const checkInIsPast = Boolean(selectedEntry && checkIn && checkIn < today);
  const activeCriteria = criteria && criteria.checkIn >= today ? criteria : null;
  const resultsQuery = useAvailabilitySearch(activeCriteria);

  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
      const timer = setInterval(() => setNowMs(Date.now()), 60_000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') setNowMs(Date.now());
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, []),
  );

  const handlePropertyChange = (nextPropertyId: string) => {
    const nextProperty = catalogQuery.data?.find(({ property }) => property.id === nextPropertyId);
    if (nextProperty) {
      const nextMaxGuests = Math.max(1, ...nextProperty.units.map((unit) => unit.maxGuests));
      setGuests(Math.min(selectedGuests, nextMaxGuests));
    }
    if (
      nextProperty &&
      checkIn &&
      checkIn < todayIsoInTimeZone(nextProperty.property.timezone, new Date())
    ) {
      setCheckIn(null);
      setCheckOut(null);
      setErrors((current) => ({ ...current, checkIn: undefined, checkOut: undefined }));
    }
    setPropertyId(nextPropertyId);
    setPropertyError(false);
    setCriteria(null);
  };

  const handleCheckInChange = (date: IsoDate) => {
    setCheckIn(date);
    setCriteria(null);
    setErrors((current) => ({ ...current, checkIn: undefined, checkOut: undefined }));
    if (!checkOut || checkOut <= date) {
      setCheckOut(addDays(date, 1));
    }
  };

  const handleCheckOutChange = (date: IsoDate) => {
    setCheckOut(date);
    setCriteria(null);
    setErrors((current) => ({ ...current, checkOut: undefined }));
  };

  const handleSearch = () => {
    const nextErrors = validateSearchCriteria({
      checkIn,
      checkOut,
      guests: selectedGuests,
      maxGuests,
    });
    if (selectedEntry && checkIn && checkIn < today) {
      nextErrors.checkIn = 'validation.checkInPast';
    }
    setErrors(nextErrors);
    setPropertyError(!selectedEntry);
    if (hasErrors(nextErrors) || !selectedEntry || !checkIn || !checkOut) {
      return;
    }
    setCriteria({
      propertyId: selectedEntry.property.id,
      checkIn,
      checkOut,
      guests: selectedGuests,
    });
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('search.title')} />

      {catalogQuery.isSuccess && catalogQuery.data.length > 0 && !selectedEntry ? (
        <Text style={styles.subtitle}>{t('search.subtitle')}</Text>
      ) : null}

      <Card style={styles.form}>
        <View style={styles.propertySection}>
          <Text style={styles.fieldLabel}>{t('search.propertyTitle')}</Text>

          {catalogQuery.isLoading ? <LoadingState message={t('common.loading')} /> : null}
          {catalogQuery.isError ? (
            <ErrorState
              title={t('search.propertyErrorTitle')}
              message={catalogQuery.error ? t(getErrorCode(catalogQuery.error)) : undefined}
              retryLabel={t('common.retry')}
              onRetry={() => void catalogQuery.refetch()}
            />
          ) : null}
          {catalogQuery.isSuccess && catalogQuery.data.length === 0 ? (
            <EmptyState title={t('home.emptyTitle')} message={t('home.emptyMessage')} />
          ) : null}

          {catalogQuery.data?.map(({ property }) => {
            const selected = selectedEntry?.property.id === property.id;
            return (
              <Pressable
                key={property.id}
                onPress={() => handlePropertyChange(property.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${property.name}, ${property.locationLabel}`}
                style={({ pressed }) => [
                  styles.propertyOption,
                  selected && styles.propertyOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <View style={styles.propertyOptionText}>
                  <Text style={styles.propertyName}>{property.name}</Text>
                  <Text style={styles.propertyLocation}>{property.locationLabel}</Text>
                </View>
              </Pressable>
            );
          })}

          {propertyError ? (
            <Text style={styles.error}>{t('validation.propertyRequired')}</Text>
          ) : null}
        </View>

        <View style={styles.datesRow}>
          <DateField
            label={t('search.checkIn')}
            value={checkIn}
            onChange={handleCheckInChange}
            placeholder={t('search.checkInPlaceholder')}
            minDate={today}
            todayDate={today}
            error={
              checkInIsPast
                ? t('validation.checkInPast')
                : errors.checkIn
                  ? t(errors.checkIn)
                  : undefined
            }
            disabled={!selectedEntry}
          />
          <DateField
            label={t('search.checkOut')}
            value={checkOut}
            onChange={handleCheckOutChange}
            placeholder={t('search.checkOutPlaceholder')}
            minDate={checkIn && !checkInIsPast ? addDays(checkIn, 1) : addDays(today, 1)}
            todayDate={today}
            error={errors.checkOut ? t(errors.checkOut) : undefined}
            disabled={!selectedEntry || !checkIn || checkInIsPast}
          />
        </View>

        <GuestCounter
          value={selectedGuests}
          max={maxGuests ?? selectedGuests}
          disabled={!selectedEntry}
          onChange={(next) => {
            setGuests(next);
            setCriteria(null);
            setErrors((current) => ({ ...current, guests: undefined }));
          }}
          error={errors.guests ? t(errors.guests) : undefined}
        />

        <Button
          title={t('search.searchCta')}
          size="lg"
          fullWidth
          disabled={catalogQuery.isLoading || catalogQuery.isError || !catalogQuery.data?.length}
          onPress={handleSearch}
        />
      </Card>

      {activeCriteria ? (
        <Section
          title={
            resultsQuery.isSuccess && resultsQuery.data.length > 0
              ? t('search.resultsCount', { count: resultsQuery.data.length })
              : t('search.resultsTitle')
          }
        >
          {resultsQuery.isLoading ? <LoadingState message={t('search.loadingMessage')} /> : null}

          {resultsQuery.isError ? (
            <ErrorState
              title={t('search.errorTitle')}
              message={resultsQuery.error ? t(getErrorCode(resultsQuery.error)) : undefined}
              retryLabel={t('common.retry')}
              onRetry={() => void resultsQuery.refetch()}
            />
          ) : null}

          {resultsQuery.isSuccess && resultsQuery.data.length === 0 ? (
            <EmptyState title={t('search.noResultsTitle')} message={t('search.noResultsMessage')} />
          ) : null}

          {resultsQuery.data?.length ? (
            <View style={styles.results}>
              {resultsQuery.data.map((available) => (
                <UnitCard
                  key={available.unit.id}
                  unit={available.unit}
                  onPress={() =>
                    router.push({
                      pathname: '/units/[unitId]',
                      params: {
                        unitId: available.unit.id,
                        checkIn: activeCriteria.checkIn,
                        checkOut: activeCriteria.checkOut,
                        guests: String(activeCriteria.guests),
                      },
                    })
                  }
                />
              ))}
            </View>
          ) : null}
        </Section>
      ) : null}
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
  propertySection: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  propertyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  propertyOptionText: {
    flex: 1,
    gap: spacing.xs,
  },
  propertyName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  propertyLocation: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  datesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  results: {
    gap: spacing.lg,
  },
});
