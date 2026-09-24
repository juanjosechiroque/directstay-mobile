import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { IsoDate } from '@/lib/dates';

export interface BookingStayDraft {
  unitId: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  guestCount: number;
}

export interface BookingGuestDraft {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneLocalNumber: string;
  specialRequests: string;
}

/** A booking already created by the server for the current stay, pending payment. */
export interface BookingPendingDraft {
  id: string;
  unitId: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  guestCount: number;
  holdExpiresAt: string;
}

interface BookingDraftValue {
  stay: BookingStayDraft | null;
  guest: BookingGuestDraft | null;
  pending: BookingPendingDraft | null;
  setStay: (stay: BookingStayDraft) => void;
  setGuest: (guest: BookingGuestDraft) => void;
  setPending: (pending: BookingPendingDraft | null) => void;
}

interface BookingDraftState {
  stay: BookingStayDraft | null;
  guest: BookingGuestDraft | null;
  pending: BookingPendingDraft | null;
}

const BookingDraftContext = createContext<BookingDraftValue | null>(null);

function isSameStay(a: BookingStayDraft | null, b: BookingStayDraft): boolean {
  return (
    a !== null &&
    a.unitId === b.unitId &&
    a.checkIn === b.checkIn &&
    a.checkOut === b.checkOut &&
    a.guestCount === b.guestCount
  );
}

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  // Stay and guest live in one state object so changing the stay can clear the guest
  // inside a pure updater. State updaters must have no side effects: React may invoke
  // them twice under StrictMode/concurrent rendering.
  const [draft, setDraft] = useState<BookingDraftState>({ stay: null, guest: null, pending: null });

  const setStay = useCallback((next: BookingStayDraft) => {
    // A different stay invalidates the captured guest data and any pending booking.
    setDraft((current) =>
      isSameStay(current.stay, next) ? current : { stay: next, guest: null, pending: null },
    );
  }, []);

  const setGuest = useCallback((next: BookingGuestDraft) => {
    setDraft((current) => ({ ...current, guest: next }));
  }, []);

  const setPending = useCallback((next: BookingPendingDraft | null) => {
    setDraft((current) => ({ ...current, pending: next }));
  }, []);

  const value = useMemo<BookingDraftValue>(
    () => ({
      stay: draft.stay,
      guest: draft.guest,
      pending: draft.pending,
      setStay,
      setGuest,
      setPending,
    }),
    [draft.stay, draft.guest, draft.pending, setStay, setGuest, setPending],
  );

  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>;
}

export function useBookingDraft(): BookingDraftValue {
  const value = useContext(BookingDraftContext);
  if (!value) {
    throw new Error('useBookingDraft must be used within a BookingDraftProvider');
  }
  return value;
}
