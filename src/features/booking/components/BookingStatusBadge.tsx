import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone } from '@/components/Badge';
import type { BookingStatus } from '@/features/booking/types';

const STATUS_TONES: Record<BookingStatus, BadgeTone> = {
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'success',
  CANCELED: 'neutral',
  REFUNDED: 'info',
};

export function bookingStatusTone(status: BookingStatus): BadgeTone {
  return STATUS_TONES[status];
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`booking.status.${status}`)} tone={STATUS_TONES[status]} />;
}
