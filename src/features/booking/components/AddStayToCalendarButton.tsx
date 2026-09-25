import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { Button } from '@/components';
import { openStayCalendarForm } from '@/features/booking/calendar-event';
import type { Booking } from '@/features/booking/types';

export function AddStayToCalendarButton({ booking }: { booking: Booking }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (booking.status !== 'CONFIRMED') return null;

  const onPress = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const result = await openStayCalendarForm({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        propertyName: booking.propertyName,
        unitName: booking.unitName,
        title: t('calendar.stayTitle', { property: '{{property}}', unit: '{{unit}}' }),
        // The current catalog addresses are references and are not verified locations.
      });
      if (result === 'permission-denied') setMessage(t('calendar.permissionDenied'));
    } catch {
      setMessage(t('calendar.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        title={t('calendar.addStay')}
        variant="secondary"
        fullWidth
        loading={busy}
        disabled={busy}
        onPress={() => void onPress()}
      />
      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    </>
  );
}
