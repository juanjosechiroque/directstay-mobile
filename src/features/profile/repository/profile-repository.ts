import type { DemoProfile } from '@/features/profile/types';

/**
 * Profile/session contract.
 *
 * The current implementation is a local demo profile — no real authentication. A future
 * `SupabaseProfileRepository` reads the owner-scoped `profiles` row.
 */
export interface ProfileRepository {
  getCurrentProfile(): Promise<DemoProfile>;
}
