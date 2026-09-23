import { diffInNights, isIsoDate } from '@/lib/dates';

/**
 * Local form validation.
 *
 * Validators return i18n keys, never user-facing copy. Screens translate them through
 * `t(...)`, keeping every visible string in the i18n layer. These are UX guards only:
 * the server (RPC/constraint) remains authoritative.
 */

export interface SearchCriteriaInput {
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  maxGuests?: number;
}

export type SearchCriteriaErrors = Partial<Record<'checkIn' | 'checkOut' | 'guests', string>>;

export function validateSearchCriteria(input: SearchCriteriaInput): SearchCriteriaErrors {
  const errors: SearchCriteriaErrors = {};

  if (!input.checkIn) {
    errors.checkIn = 'validation.checkInRequired';
  }
  if (!input.checkOut) {
    errors.checkOut = 'validation.checkOutRequired';
  }
  if (input.checkIn && input.checkOut) {
    if (input.checkOut <= input.checkIn || diffInNights(input.checkIn, input.checkOut) < 1) {
      errors.checkOut = 'validation.checkOutAfterCheckIn';
    }
  }
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    errors.guests = 'validation.guestsRequired';
  } else if (input.maxGuests && input.guests > input.maxGuests) {
    errors.guests = 'validation.guestsTooMany';
  }

  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

export interface GuestFormInput {
  fullName: string;
  email: string;
  phone: string;
}

export type GuestFormErrors = Partial<Record<keyof GuestFormInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\-\s\d]{6,}$/;

export function validateGuestForm(input: GuestFormInput): GuestFormErrors {
  const errors: GuestFormErrors = {};

  const fullName = input.fullName.trim();
  if (!fullName) {
    errors.fullName = 'validation.nameRequired';
  } else if (fullName.length < 2) {
    errors.fullName = 'validation.nameTooShort';
  }

  const email = input.email.trim();
  if (!email) {
    errors.email = 'validation.emailRequired';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'validation.emailInvalid';
  }

  const phone = input.phone.trim();
  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'validation.phoneInvalid';
  }

  return errors;
}

/**
 * Route params are untrusted input: an impossible date such as `2026-13-99` must become
 * a validation state, never a silently wrong calculation.
 */
export function toIsoDateParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && isIsoDate(value) ? value : null;
}

export function toPositiveIntParam(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
