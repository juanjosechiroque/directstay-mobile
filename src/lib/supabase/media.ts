import type { DatabaseClient } from '@/lib/supabase/client';

/** Public-read bucket for catalog photography. Writes are out-of-band only. */
export const CATALOG_MEDIA_BUCKET = 'catalog-media';

/**
 * Resolves a stored media path to its public URL. The bucket is public-read, so no signed
 * URL or secret is required, and the app never uploads or deletes objects.
 */
export function createMediaUrlResolver(client: DatabaseClient): (storagePath: string) => string {
  return (storagePath) =>
    client.storage.from(CATALOG_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
