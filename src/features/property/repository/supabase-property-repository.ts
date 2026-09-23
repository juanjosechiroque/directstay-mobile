import type { PropertyRepository } from '@/features/property/repository/property-repository';
import type { PropertyCatalog, Unit } from '@/features/property/types';
import { toAppError } from '@/lib/supabase/errors';
import type { DatabaseClient } from '@/lib/supabase/client';
import { createMediaUrlResolver } from '@/lib/supabase/media';
import { mapCatalog, mapUnit } from '@/lib/supabase/mappers';
import type { CatalogJson, CatalogUnitJson } from '@/lib/supabase/types';
import type { Locale } from '@/lib/locale';

/**
 * Supabase-backed property catalog.
 *
 * Both reads go through public RPCs that are scoped server-side to the deployment's active
 * organization, so the client never has to (and never can) widen the scope by passing a
 * different organization or by querying base tables directly.
 */
export class SupabasePropertyRepository implements PropertyRepository {
  private readonly resolveMediaUrl: (storagePath: string) => string;

  constructor(
    private readonly client: DatabaseClient,
    private readonly organizationSlug: string,
  ) {
    this.resolveMediaUrl = createMediaUrlResolver(client);
  }

  async getCatalog(locale: Locale): Promise<PropertyCatalog[]> {
    const { data, error } = await this.client.rpc('get_catalog', {
      p_organization_slug: this.organizationSlug,
      p_locale: locale,
    });
    if (error) {
      throw toAppError(error);
    }
    if (!data) {
      return [];
    }
    return mapCatalog(data as CatalogJson, this.resolveMediaUrl);
  }

  async getUnit(unitId: string, locale: Locale): Promise<Unit | null> {
    const { data, error } = await this.client.rpc('get_unit', {
      p_organization_slug: this.organizationSlug,
      p_unit_id: unitId,
      p_locale: locale,
    });
    if (error) {
      throw toAppError(error);
    }
    if (!data) {
      return null;
    }
    return mapUnit(data as CatalogUnitJson, this.resolveMediaUrl);
  }
}
