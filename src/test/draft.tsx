import { useEffect, type ReactNode } from 'react';
import { Text } from 'react-native';

import {
  BookingDraftProvider,
  useBookingDraft,
  type BookingGuestDraft,
  type BookingStayDraft,
} from '@/features/booking/draft/booking-draft-context';

export const STAY_DRAFT: BookingStayDraft = {
  unitId: 'unit-1',
  checkIn: '2026-11-10',
  checkOut: '2026-11-12',
  guestCount: 2,
};

function Seed({
  stay,
  guest,
  children,
}: {
  stay: BookingStayDraft | null;
  guest?: BookingGuestDraft;
  children: ReactNode;
}) {
  const draft = useBookingDraft();
  useEffect(() => {
    if (stay) draft.setStay(stay);
    if (guest) draft.setGuest(guest);
    // Seed once on mount, before the screen reads the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render children only once the provider has the seeded stay, so the screen
  // mounts with the draft already in place.
  const ready = stay ? draft.stay !== null : true;
  return ready ? <>{children}</> : null;
}

/** Shows the guest draft held in context so tests can assert it was preserved. */
export function DraftProbe() {
  const { guest } = useBookingDraft();
  return <Text testID="draft-probe">{guest ? JSON.stringify(guest) : 'no-guest-draft'}</Text>;
}

/** Wraps a booking-flow screen in a draft provider that is seeded before the screen mounts. */
export function withDraft(
  ui: ReactNode,
  { stay = STAY_DRAFT, guest }: { stay?: BookingStayDraft | null; guest?: BookingGuestDraft } = {},
) {
  return (
    <BookingDraftProvider>
      <Seed stay={stay} guest={guest}>
        {ui}
        <DraftProbe />
      </Seed>
    </BookingDraftProvider>
  );
}
