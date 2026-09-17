import type { AvailabilityRepository } from '@/features/search/repository';
import type { AvailabilityQuery, AvailableUnit } from '@/features/search/types';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { mapSearchResult } from '@/lib/supabase/mappers';
import { createMediaUrlResolver } from '@/lib/supabase/media';
import type { SearchUnitJson } from '@/lib/supabase/types';
import type { Locale } from '@/lib/locale';

/**
 * Supabase-backed availability search.
 *
 * All availability, capacity, active-state and organization rules live in the
 * `search_available_units` RPC. The client sends only the criteria and renders the
 * server's answer: there is no divergent availability algorithm in TypeScript.
 */
export class SupabaseAvailabilityRepository implements AvailabilityRepository {
  private readonly resolveMediaUrl: (storagePath: string) => string;

  constructor(
    private readonly client: DatabaseClient,
    private readonly organizationSlug: string,
  ) {
    this.resolveMediaUrl = createMediaUrlResolver(client);
  }

  async searchAvailableUnits(
    { checkIn, checkOut, guests }: AvailabilityQuery,
    locale: Locale,
  ): Promise<AvailableUnit[]> {
    const { data, error } = await this.client.rpc('search_available_units', {
      p_organization_slug: this.organizationSlug,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_locale: locale,
    });
    if (error) {
      throw toAppError(error);
    }
    if (!data) {
      return [];
    }
    return (data as SearchUnitJson[]).map((row) => mapSearchResult(row, this.resolveMediaUrl));
  }
}
