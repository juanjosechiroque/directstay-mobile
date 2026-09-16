import type { Property, Unit } from '@/features/property/types';
import type { Locale } from '@/lib/locale';

/** A property together with its public, active units, as returned by the catalog RPC. */
export interface PropertyCatalog {
  property: Property;
  units: Unit[];
}

/**
 * Property catalog contract.
 *
 * Screens and queries depend on this interface only. Catalog copy is localized by the
 * repository (mock fixtures in tests; the Supabase adapter calls `get_catalog` /
 * `get_unit` with the locale), so screens never contain data-localization logic.
 *
 * The catalog is always scoped server-side to the deployment's active organization.
 */
export interface PropertyRepository {
  getCatalog(locale: Locale): Promise<PropertyCatalog[]>;
  getUnit(unitId: string, locale: Locale): Promise<Unit | null>;
}
