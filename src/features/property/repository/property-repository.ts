import type { Property, Unit } from '@/features/property/types';
import type { Locale } from '@/lib/locale';

/**
 * Property catalog contract.
 *
 * Screens and queries depend on this interface only. Catalog copy is localized by the
 * repository (mock data today; a Supabase adapter can select localized columns or pass
 * the locale to the API later), so screens never contain data-localization logic.
 */
export interface PropertyRepository {
  getProperty(locale: Locale): Promise<Property>;
  listUnits(locale: Locale): Promise<Unit[]>;
  getUnit(unitId: string, locale: Locale): Promise<Unit | null>;
}
