import type { AvailabilityRepository } from '@/features/search/repository/availability-repository';
import type { AvailabilityQuery, AvailableUnit } from '@/features/search/types';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { mapSearchResult } from '@/lib/supabase/mappers';
import { createMediaUrlResolver } from '@/lib/supabase/media';
import type { SearchUnitJson } from '@/lib/supabase/types';
import type { Locale } from '@/lib/locale';

export class SupabaseAvailabilityRepository implements AvailabilityRepository {
  private readonly resolveMediaUrl: (storagePath: string) => string;

  constructor(
    private readonly client: DatabaseClient,
    private readonly organizationSlug: string,
  ) {
    this.resolveMediaUrl = createMediaUrlResolver(client);
  }

  async searchAvailableUnits(
    { propertyId, unitId, checkIn, checkOut, guests }: AvailabilityQuery,
    locale: Locale,
  ): Promise<AvailableUnit[]> {
    const baseParams = {
      p_organization_slug: this.organizationSlug,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_locale: locale,
      p_unit_id: unitId ?? null,
    };
    let { data, error } = await this.client.rpc('search_available_units', {
      ...baseParams,
      p_property_id: propertyId,
    });

    if (error?.code === 'PGRST202') {
      ({ data, error } = await this.client.rpc('search_available_units', baseParams));
    }
    if (error) {
      throw toAppError(error);
    }
    if (!data) {
      return [];
    }
    return (data as SearchUnitJson[])
      .map((row) => mapSearchResult(row, this.resolveMediaUrl))
      .filter((available) => available.propertyId === propertyId);
  }
}
