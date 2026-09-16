import type { BookingRepository } from '@/features/booking/repository';
import type {
  Booking,
  CreateBookingInput,
  PaymentSimulationResult,
  Quote,
  QuoteRequest,
} from '@/features/booking/types';
import { isCancellationEligible } from '@/lib/dates/cancellation';
import { diffInNights } from '@/lib/dates';
import { AppError } from '@/lib/errors';

import { MOCK_PROPERTY, DEMO_PROFILE_ID } from '../data/property';
import { findMockUnit } from '../data/units';
import { isUnitAvailable } from './availability-rules';
import {
  findBooking,
  insertBooking,
  listAllBookings,
  nextBookingId,
  updateBooking,
} from './booking-store';
import { clone } from './clone';
import { assertMockSuccess, isEmptyScenario, simulateLatency } from './scenario';

const HOLD_MINUTES = 5;

export class MockBookingRepository implements BookingRepository {
  private buildQuote({ unitId, checkIn, checkOut, guestCount }: QuoteRequest): Quote {
    const unit = findMockUnit(unitId);
    if (!unit) {
      throw new AppError('error.notFound');
    }
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > unit.maxGuests) {
      throw new AppError('error.validation');
    }
    const nights = diffInNights(checkIn, checkOut);
    if (nights < 1) {
      throw new AppError('error.validation');
    }
    return {
      unitId,
      checkIn,
      checkOut,
      nights,
      guestCount,
      nightlyRateMinor: unit.nightlyRateMinor,
      totalAmountMinor: unit.nightlyRateMinor * nights,
      currency: unit.currency,
    };
  }

  async getQuote(request: QuoteRequest): Promise<Quote> {
    await simulateLatency();
    assertMockSuccess();
    return clone(this.buildQuote(request));
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    await simulateLatency();
    assertMockSuccess();

    const quote = this.buildQuote(input);
    if (!isUnitAvailable(quote.unitId, quote.checkIn, quote.checkOut, quote.guestCount)) {
      throw new AppError('error.unavailable');
    }

    const createdAt = new Date();
    const holdExpiresAt = new Date(createdAt.getTime() + HOLD_MINUTES * 60_000);
    const booking: Booking = {
      id: nextBookingId(),
      guestProfileId: DEMO_PROFILE_ID,
      unitId: quote.unitId,
      unitName: findMockUnit(quote.unitId)?.name ?? quote.unitId,
      status: 'PENDING_PAYMENT',
      checkIn: quote.checkIn,
      checkOut: quote.checkOut,
      nights: quote.nights,
      guestCount: quote.guestCount,
      guestName: input.guestName.trim(),
      guestEmail: input.guestEmail.trim(),
      guestPhone: input.guestPhone?.trim() || null,
      currency: quote.currency,
      nightlyRateMinor: quote.nightlyRateMinor,
      totalAmountMinor: quote.totalAmountMinor,
      holdExpiresAt: holdExpiresAt.toISOString(),
      createdAt: createdAt.toISOString(),
      confirmedAt: null,
      canceledAt: null,
      cancellationReason: null,
      refundedAt: null,
    };

    insertBooking(booking);
    return clone(booking);
  }

  async simulatePayment(bookingId: string): Promise<PaymentSimulationResult> {
    await simulateLatency();
    assertMockSuccess();

    const booking = findBooking(bookingId);
    if (!booking) {
      throw new AppError('error.notFound');
    }
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new AppError('error.validation');
    }

    // Demo-only transition. In production the webhook is the only thing that may confirm
    // a booking, after verifying the hold is still valid.
    const confirmed: Booking = {
      ...booking,
      status: 'CONFIRMED',
      confirmedAt: new Date().toISOString(),
    };
    updateBooking(confirmed);
    return clone({ booking: confirmed, demo: true });
  }

  async listBookings(): Promise<Booking[]> {
    await simulateLatency();
    assertMockSuccess();
    if (isEmptyScenario()) {
      return [];
    }
    return clone(
      listAllBookings()
        .filter((booking) => booking.guestProfileId === DEMO_PROFILE_ID)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    await simulateLatency();
    assertMockSuccess();
    const booking = findBooking(bookingId);
    if (!booking || booking.guestProfileId !== DEMO_PROFILE_ID) {
      return null;
    }
    return clone(booking);
  }

  async cancelBooking(bookingId: string): Promise<Booking> {
    await simulateLatency();
    assertMockSuccess();

    const booking = findBooking(bookingId);
    if (!booking) {
      throw new AppError('error.notFound');
    }
    if (booking.status !== 'CONFIRMED') {
      throw new AppError('error.cancelNotAllowed');
    }
    const eligible = isCancellationEligible({
      checkIn: booking.checkIn,
      checkInTime: MOCK_PROPERTY.checkInTime,
      timeZone: MOCK_PROPERTY.timezone,
    });
    if (!eligible) {
      throw new AppError('error.cancelNotAllowed');
    }

    // Frozen domain rule: a paid booking goes CONFIRMED → REFUNDED (never CANCELED).
    const refunded: Booking = {
      ...booking,
      status: 'REFUNDED',
      refundedAt: new Date().toISOString(),
    };
    updateBooking(refunded);
    return clone(refunded);
  }
}
