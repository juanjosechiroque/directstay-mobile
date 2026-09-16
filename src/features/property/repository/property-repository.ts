import type { Property, Unit } from '@/features/property/types';

/**
 * Property catalog contract.
 *
 * Screens and queries depend on this interface only. A future
 * `SupabasePropertyRepository` can implement it without touching the UI.
 */
export interface PropertyRepository {
  getProperty(): Promise<Property>;
  listUnits(): Promise<Unit[]>;
  getUnit(unitId: string): Promise<Unit | null>;
}
