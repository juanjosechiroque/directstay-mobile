import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingState, Screen } from '@/components';
import { useSessionGuard } from '@/features/auth/guards/use-session-guard';
import { BookingDraftProvider } from '@/features/booking/draft/booking-draft-context';
import { colors } from '@/lib/theme';

/**
 * Booking flow layout. Protected by a session guard: nothing inside the flow renders
 * until the user is authenticated, so a deep link cannot reach the review/guest/payment
 * steps without a session. The draft provider is scoped here so guest PII only lives while
 * the guest is inside the flow. Nested stack keeps review → guest → payment self-contained.
 */
export default function BookingLayout() {
  const { t } = useTranslation();
  const status = useSessionGuard('/search');

  if (status !== 'signedIn') {
    return (
      <Screen>
        <LoadingState message={t('common.loading')} />
      </Screen>
    );
  }

  return (
    <BookingDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </BookingDraftProvider>
  );
}
