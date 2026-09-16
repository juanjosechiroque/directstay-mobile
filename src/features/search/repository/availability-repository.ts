import type { AvailabilityQuery, AvailableUnit } from '@/features/search/types';
import type { Locale } from '@/lib/locale';

/**
 * Availability contract.
 *
 * Mirrors the future server-authoritative `search_available_units` RPC: it returns only
 * units compatible with the range and guest count, with unit copy already localized and a
 * price the client must not recompute for the final payable amount.
 */
export interface AvailabilityRepository {
  searchAvailableUnits(query: AvailabilityQuery, locale: Locale): Promise<AvailableUnit[]>;
}
