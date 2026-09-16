import type { PropertyRepository } from '@/features/property/repository';
import type { Property, Unit } from '@/features/property/types';
import { AppError } from '@/lib/errors';

import { MOCK_PROPERTY } from '../data/property';
import { MOCK_UNITS, findMockUnit } from '../data/units';
import { clone } from './clone';
import { assertMockSuccess, isEmptyScenario, simulateLatency } from './scenario';

export class MockPropertyRepository implements PropertyRepository {
  async getProperty(): Promise<Property> {
    await simulateLatency();
    assertMockSuccess();
    return clone(MOCK_PROPERTY);
  }

  async listUnits(): Promise<Unit[]> {
    await simulateLatency();
    assertMockSuccess();
    if (isEmptyScenario()) {
      return [];
    }
    return clone(MOCK_UNITS);
  }

  async getUnit(unitId: string): Promise<Unit | null> {
    await simulateLatency();
    assertMockSuccess();
    const unit = findMockUnit(unitId);
    if (!unit) {
      return null;
    }
    return clone(unit);
  }
}

export function assertUnitExists(unitId: string): void {
  if (!findMockUnit(unitId)) {
    throw new AppError('error.notFound');
  }
}
