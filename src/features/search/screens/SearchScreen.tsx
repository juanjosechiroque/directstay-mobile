import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

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
import { useAvailabilitySearch } from '@/features/search/queries/use-availability-search';
import type { AvailabilityQuery } from '@/features/search/types';
import { addDays, todayIso, type IsoDate } from '@/lib/dates';
import { getErrorCode } from '@/lib/errors';
import { colors, fontSize, spacing } from '@/lib/theme';
import { hasErrors, validateSearchCriteria, type SearchCriteriaErrors } from '@/lib/validation';

export function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const today = todayIso();

  const [checkIn, setCheckIn] = useState<IsoDate | null>(null);
  const [checkOut, setCheckOut] = useState<IsoDate | null>(null);
  const [guests, setGuests] = useState(2);
  const [errors, setErrors] = useState<SearchCriteriaErrors>({});
  const [criteria, setCriteria] = useState<AvailabilityQuery | null>(null);

  const resultsQuery = useAvailabilitySearch(criteria);

  const handleCheckInChange = (date: IsoDate) => {
    setCheckIn(date);
    setErrors((current) => ({ ...current, checkIn: undefined, checkOut: undefined }));
    if (!checkOut || checkOut <= date) {
      setCheckOut(addDays(date, 1));
    }
  };

  const handleCheckOutChange = (date: IsoDate) => {
    setCheckOut(date);
    setErrors((current) => ({ ...current, checkOut: undefined }));
  };

  const handleSearch = () => {
    const nextErrors = validateSearchCriteria({ checkIn, checkOut, guests, maxGuests: 0 });
    setErrors(nextErrors);
    if (hasErrors(nextErrors) || !checkIn || !checkOut) {
      return;
    }
    setCriteria({ checkIn, checkOut, guests });
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('search.title')} />

      <Text style={styles.subtitle}>{t('search.subtitle')}</Text>

      <Card style={styles.form}>
        <View style={styles.datesRow}>
          <DateField
            label={t('search.checkIn')}
            value={checkIn}
            onChange={handleCheckInChange}
            placeholder={t('search.checkInPlaceholder')}
            minDate={today}
            error={errors.checkIn ? t(errors.checkIn) : undefined}
          />
          <DateField
            label={t('search.checkOut')}
            value={checkOut}
            onChange={handleCheckOutChange}
            placeholder={t('search.checkOutPlaceholder')}
            minDate={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
            error={errors.checkOut ? t(errors.checkOut) : undefined}
          />
        </View>

        <GuestCounter
          value={guests}
          onChange={(next) => {
            setGuests(next);
            setErrors((current) => ({ ...current, guests: undefined }));
          }}
          error={errors.guests ? t(errors.guests) : undefined}
        />

        <Button title={t('search.searchCta')} size="lg" fullWidth onPress={handleSearch} />
        <Text style={styles.hint}>{t('search.hint')}</Text>
      </Card>

      {criteria ? (
        <Section
          title={t('search.resultsTitle')}
          subtitle={
            resultsQuery.data
              ? t('search.resultsCount', { count: resultsQuery.data.length })
              : undefined
          }
          action={
            <Button
              title={t('search.changeSearch')}
              variant="ghost"
              onPress={() => setCriteria(null)}
            />
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
                        checkIn: criteria.checkIn,
                        checkOut: criteria.checkOut,
                        guests: String(criteria.guests),
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
  datesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  results: {
    gap: spacing.lg,
  },
});
