import type { AvailabilityRepository } from '@/features/search/repository';
import type { AvailabilityQuery, AvailableUnit } from '@/features/search/types';
import { systemClock, type Clock } from '@/lib/clock';
import { diffInNights } from '@/lib/dates';
import type { Locale } from '@/lib/locale';

import { getMockUnits } from '../data/units';
import { isUnitAvailable } from './availability-rules';
import { expireStaleHolds } from './booking-store';
import { clone } from './clone';
import { assertMockSuccess, isEmptyScenario, simulateLatency } from './scenario';

export class MockAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly clock: Clock = systemClock) {}

  async searchAvailableUnits(
    { checkIn, checkOut, guests }: AvailabilityQuery,
    locale: Locale,
  ): Promise<AvailableUnit[]> {
    await simulateLatency();
    assertMockSuccess();

    const now = this.clock.now();
    // Expired holds must not retain inventory; transform them before searching.
    expireStaleHolds(now);

    if (isEmptyScenario()) {
      return [];
    }

    const nights = diffInNights(checkIn, checkOut);
    if (nights < 1) {
      throw new Error('Invalid date range supplied to availability search');
    }

    const available = getMockUnits(locale)
      .filter((unit) => isUnitAvailable(unit.id, checkIn, checkOut, guests, now.getTime()))
      .map<AvailableUnit>((unit) => ({
        unit,
        nights,
        totalAmountMinor: unit.nightlyRateMinor * nights,
        currency: unit.currency,
      }));

    return clone(available);
  }
}
