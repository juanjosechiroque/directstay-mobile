import { BOOKING_STATUSES } from '@/features/booking/types';

import en from '../locales/en.json';
import es from '../locales/es.json';

const AMENITIES = [
  'wifi',
  'breakfast',
  'private_bathroom',
  'fireplace',
  'mountain_view',
  'terrace',
  'heating',
  'free_parking',
  'kitchenette',
  'family_friendly',
];

const HIGHLIGHTS = [
  'mountain_view',
  'local_hosts',
  'breakfast_included',
  'direct_booking',
  'nature',
];

function lookup(source: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      source,
    );
}

describe.each<[string, Record<string, unknown>]>([
  ['es', es as Record<string, unknown>],
  ['en', en as Record<string, unknown>],
])('catalog translations (%s)', (_locale, resources) => {
  it('translates every booking status', () => {
    for (const status of BOOKING_STATUSES) {
      expect(typeof lookup(resources, `booking.status.${status}`)).toBe('string');
    }
  });

  it('translates every amenity', () => {
    for (const amenity of AMENITIES) {
      expect(typeof lookup(resources, `amenities.${amenity}`)).toBe('string');
    }
  });

  it('translates every highlight', () => {
    for (const highlight of HIGHLIGHTS) {
      expect(typeof lookup(resources, `highlights.${highlight}`)).toBe('string');
    }
  });

  it('translates the critical booking flow copy', () => {
    for (const key of [
      'booking.reviewTitle',
      'booking.guestTitle',
      'booking.guestPrivacyNote',
      'booking.paymentTitle',
      'booking.demoPayCta',
      'booking.confirmedTitle',
      'bookings.cancelNotAllowedMessage',
      'stay.title',
      'stay.wifiTitle',
      'settings.languageEs',
      'error.authRateLimited',
    ]) {
      expect(typeof lookup(resources, key)).toBe('string');
    }
  });
});
