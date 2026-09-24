import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseIsoDate, toIsoDate, todayIso, type IsoDate } from '@/lib/dates';
import { colors, control, fontSize, radius, spacing } from '@/lib/theme';

interface CalendarProps {
  selected: IsoDate | null;
  onSelect: (date: IsoDate) => void;
  minDate?: IsoDate;
  maxDate?: IsoDate;
  todayDate?: IsoDate;
}

/**
 * Minimal, dependency-free month calendar tuned for touch. Booking dates are handled as
 * `YYYY-MM-DD` business dates in UTC, so there is no timezone drift when rendering.
 */
export function Calendar({ selected, onSelect, minDate, maxDate, todayDate }: CalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-PE';
  const today = todayDate ?? todayIso();
  const minimum = minDate ?? today;

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const anchor = selected && selected >= minimum ? selected : minimum;
    const date = parseIsoDate(anchor);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(Date.UTC(2024, 0, 1 + index))),
    );
  }, [locale]);

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    [locale],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1))),
    [locale, visibleMonth],
  );

  const firstWeekday =
    (new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();

  const cells: (IsoDate | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      toIsoDate(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, index + 1))),
    ),
  ];

  const canGoPrevious =
    toIsoDate(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1))) > minimum;

  const shiftMonth = (delta: number) => {
    setVisibleMonth((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          disabled={!canGoPrevious}
          accessibilityRole="button"
          accessibilityLabel={t('search.previousMonth')}
          hitSlop={12}
          style={[styles.navButton, !canGoPrevious && styles.navDisabled]}
        >
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel={t('search.nextMonth')}
          hitSlop={12}
          style={styles.navButton}
        >
          <Text style={styles.navGlyph}>›</Text>
        </Pressable>
      </View>

      {today >= minimum && (!maxDate || today <= maxDate) ? (
        <Pressable
          onPress={() => onSelect(today)}
          accessibilityRole="button"
          accessibilityLabel={`${t('search.today')}, ${dayFormatter.format(parseIsoDate(today))}`}
          style={styles.todayButton}
        >
          <Text style={styles.todayLabel}>{t('search.today')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.weekdays} importantForAccessibility="no-hide-descendants">
        {weekdayLabels.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const disabled = date < minimum || (maxDate ? date > maxDate : false);
          const isSelected = date === selected && !disabled;
          const isToday = date === today && !disabled;
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={
                isToday
                  ? `${dayFormatter.format(parseIsoDate(date))}, ${t('search.today')}`
                  : dayFormatter.format(parseIsoDate(date))
              }
              accessibilityState={{ selected: isSelected, disabled }}
              style={styles.cell}
            >
              <View
                style={[styles.day, isToday && styles.dayToday, isSelected && styles.daySelected]}
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={[
                    styles.dayLabel,
                    disabled && styles.dayDisabled,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {Number(date.slice(-2))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  todayButton: {
    alignSelf: 'flex-end',
    minHeight: control.minTouchSize,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  todayLabel: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  navDisabled: {
    opacity: 0.3,
  },
  navGlyph: {
    fontSize: fontSize.xl,
    color: colors.primary,
    lineHeight: 26,
  },
  monthLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    minHeight: control.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  day: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  dayDisabled: {
    color: colors.textSubtle,
    opacity: 0.5,
  },
  dayLabelSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
