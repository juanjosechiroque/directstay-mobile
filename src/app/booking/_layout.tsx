import { Stack } from 'expo-router';

import { BookingDraftProvider } from '@/features/booking/draft/booking-draft-context';
import { colors } from '@/lib/theme';

/**
 * Booking flow layout. The draft provider is intentionally scoped to this route group so
 * guest PII only lives while the guest is inside the booking flow. Nested stack keeps
 * review → guest → payment → result navigation self-contained.
 */
export default function BookingLayout() {
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
