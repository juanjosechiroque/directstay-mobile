import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static guard for the privacy rule: guest PII must never be passed through route params
 * (URLs, deep links, navigation state). Only identifiers and non-sensitive business data
 * may travel between booking screens; PII lives in the in-memory BookingDraftProvider.
 */
const ROUTE_FILES = [
  'src/features/booking/screens/BookingReviewScreen.tsx',
  'src/features/booking/screens/BookingGuestScreen.tsx',
  'src/features/booking/screens/BookingPaymentScreen.tsx',
  'src/features/property/screens/UnitDetailScreen.tsx',
];

const PII = /\b(fullName|email|phone|guestName|guestEmail|guestPhone)\b/;

function readSource(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8');
}

describe('navigation privacy', () => {
  it('never passes guest PII inside a route params object', () => {
    for (const file of ROUTE_FILES) {
      const source = readSource(file);
      const paramBlocks = source.match(/params:\s*\{[^}]*\}/g) ?? [];
      for (const block of paramBlocks) {
        expect(block).not.toMatch(PII);
      }
    }
  });

  it('never declares guest PII in useLocalSearchParams generics', () => {
    for (const file of ROUTE_FILES) {
      const source = readSource(file);
      const searchParamTypes = source.match(/useLocalSearchParams<\{[^}]*\}>/g) ?? [];
      for (const block of searchParamTypes) {
        expect(block).not.toMatch(PII);
      }
    }
  });

  it('keeps guest PII inside the booking draft context only', () => {
    const guestScreen = readSource('src/features/booking/screens/BookingGuestScreen.tsx');
    expect(guestScreen).toMatch(/useBookingDraft/);
    expect(guestScreen).toMatch(/setGuest/);
  });

  it('has no login route', () => {
    expect(readdirSync(join(process.cwd(), 'src/app'))).not.toContain('login.tsx');
  });
});
