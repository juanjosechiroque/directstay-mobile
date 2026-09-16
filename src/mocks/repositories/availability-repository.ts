import type { AvailabilityRepository } from '@/features/search/repository';
import type { AvailabilityQuery, AvailableUnit } from '@/features/search/types';
import { diffInNights } from '@/lib/dates';

import { MOCK_UNITS } from '../data/units';
import { isUnitAvailable } from './availability-rules';
import { clone } from './clone';
import { assertMockSuccess, isEmptyScenario, simulateLatency } from './scenario';

export class MockAvailabilityRepository implements AvailabilityRepository {
  async searchAvailableUnits({
    checkIn,
    checkOut,
    guests,
  }: AvailabilityQuery): Promise<AvailableUnit[]> {
    await simulateLatency();
    assertMockSuccess();
    if (isEmptyScenario()) {
      return [];
    }

    const nights = diffInNights(checkIn, checkOut);
    if (nights < 1) {
      throw new Error('Invalid date range supplied to availability search');
    }

    const now = Date.now();
    const available = MOCK_UNITS.filter((unit) =>
      isUnitAvailable(unit.id, checkIn, checkOut, guests, now),
    ).map<AvailableUnit>((unit) => ({
      unit,
      nights,
      totalAmountMinor: unit.nightlyRateMinor * nights,
      currency: unit.currency,
    }));

    return clone(available);
  }
}
