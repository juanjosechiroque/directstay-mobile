import { Stack } from 'expo-router';
import { BookingDraftProvider } from '@/features/booking/draft/booking-draft-context';
import { colors } from '@/lib/theme';

/**
 * Public booking flow. Guest PII stays in this in-memory provider and is discarded when
 * the flow unmounts. Guest identity is created only after the guest submits their details.
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
