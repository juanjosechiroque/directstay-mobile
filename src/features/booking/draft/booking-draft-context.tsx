import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Quote } from '@/features/booking/types';
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

interface BookingDraftValue {
  stay: BookingStayDraft | null;
  quote: Quote | null;
  guest: BookingGuestDraft | null;
  setStay: (stay: BookingStayDraft) => void;
  setQuote: (quote: Quote) => void;
  setGuest: (guest: BookingGuestDraft) => void;
  clear: () => void;
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
  const [stay, setStayState] = useState<BookingStayDraft | null>(null);
  const [quote, setQuoteState] = useState<Quote | null>(null);
  const [guest, setGuestState] = useState<BookingGuestDraft | null>(null);

  const setStay = useCallback((next: BookingStayDraft) => {
    setStayState((current) => {
      if (isSameStay(current, next)) {
        return current;
      }
      // A different stay invalidates previously captured guest/quote data.
      setQuoteState(null);
      setGuestState(null);
      return next;
    });
  }, []);

  const setQuote = useCallback((next: Quote) => {
    setQuoteState(next);
  }, []);

  const setGuest = useCallback((next: BookingGuestDraft) => {
    setGuestState(next);
  }, []);

  const clear = useCallback(() => {
    setStayState(null);
    setQuoteState(null);
    setGuestState(null);
  }, []);

  const value = useMemo<BookingDraftValue>(
    () => ({ stay, quote, guest, setStay, setQuote, setGuest, clear }),
    [stay, quote, guest, setStay, setQuote, setGuest, clear],
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
