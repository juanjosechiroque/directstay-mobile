import type { PropertyRepository, PropertyCatalog } from '@/features/property/repository';
import type { Property, Unit } from '@/features/property/types';
import type { Locale } from '@/lib/locale';

import { getMockProperty } from '../data/property';
import { findMockUnit, getMockUnits } from '../data/units';
import { clone } from './clone';
import { assertMockSuccess, isEmptyScenario, simulateLatency } from './scenario';

/**
 * In-memory fixture adapter (tests only).
 *
 * Implements the runtime contract (`getCatalog`, `getUnit`) so repository consumers can be
 * tested without network access. `getProperty`/`listUnits` are convenience helpers that
 * mirror the pre-catalog API for older tests; they are not part of the runtime interface.
 */
export class MockPropertyRepository implements PropertyRepository {
  async getCatalog(locale: Locale): Promise<PropertyCatalog[]> {
    await simulateLatency();
    assertMockSuccess();
    if (isEmptyScenario()) {
      return [];
    }
    return clone([{ property: getMockProperty(locale), units: getMockUnits(locale) }]);
  }

  async getUnit(unitId: string, locale: Locale): Promise<Unit | null> {
    await simulateLatency();
    assertMockSuccess();
    const unit = findMockUnit(unitId, locale);
    return unit ? clone(unit) : null;
  }

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
}
