import type { ProfileRepository } from '@/features/profile/repository';
import type { GuestProfile } from '@/features/profile/types';
import type { DatabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { ProfileRow } from '@/lib/supabase/types';

/**
 * Supabase-backed owner profile.
 *
 * The email comes from the authenticated session; the profile row is restricted by RLS to
 * the caller. Returns `null` when signed out so no demo identity is ever fabricated.
 */
export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: DatabaseClient) {}

  async getCurrentProfile(): Promise<GuestProfile | null> {
    const {
      data: { user },
      error: userError,
    } = await this.client.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data, error } = await this.client
      .from('profiles')
      .select('id, display_name, phone, created_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      throw toAppError(error);
    }
    if (!data) {
      return null;
    }

    const row = data as ProfileRow;
    return {
      id: row.id,
      displayName: row.display_name ?? user.email ?? '',
      email: user.email ?? '',
      phone: row.phone,
      memberSince: (row.created_at ?? '').slice(0, 10),
    };
  }
}
