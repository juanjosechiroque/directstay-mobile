import type { PropertyRepository } from '@/features/property/repository';
import type { Property, Unit } from '@/features/property/types';
import type { Locale } from '@/lib/locale';

import { getMockProperty } from '../data/property';
import { findMockUnit, getMockUnits } from '../data/units';
import { clone } from './clone';
import { assertMockSuccess, isEmptyScenario, simulateLatency } from './scenario';

export class MockPropertyRepository implements PropertyRepository {
  async getProperty(locale: Locale): Promise<Property> {
    await simulateLatency();
    assertMockSuccess();
    return clone(getMockProperty(locale));
  }

  async listUnits(locale: Locale): Promise<Unit[]> {
    await simulateLatency();
    assertMockSuccess();
    if (isEmptyScenario()) {
      return [];
    }
    return clone(getMockUnits(locale));
  }

  async getUnit(unitId: string, locale: Locale): Promise<Unit | null> {
    await simulateLatency();
    assertMockSuccess();
    const unit = findMockUnit(unitId, locale);
    return unit ? clone(unit) : null;
  }
}
