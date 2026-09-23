import type { PropertyCatalog, Unit } from '@/features/property/types';
import type { Locale } from '@/lib/locale';

/**
 * Property catalog contract.
 *
 * Screens and queries depend on this interface only. Catalog copy is localized by the
 * repository (the Supabase adapter calls `get_catalog` / `get_unit` with the locale), so
 * screens never contain data-localization logic.
 *
 * The catalog is always scoped server-side to the deployment's active organization.
 */
export interface PropertyRepository {
  getCatalog(locale: Locale): Promise<PropertyCatalog[]>;
  getUnit(unitId: string, locale: Locale): Promise<Unit | null>;
}
