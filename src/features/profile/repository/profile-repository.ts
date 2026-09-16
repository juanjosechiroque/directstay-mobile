import type { GuestProfile } from '@/features/profile/types';

/**
 * Profile contract.
 *
 * In the Supabase adapter this reads the owner-scoped `profiles` row plus the auth user
 * email. It returns `null` when there is no authenticated session, so screens can rely on
 * the session guard instead of fabricating a demo profile.
 */
export interface ProfileRepository {
  getCurrentProfile(): Promise<GuestProfile | null>;
}
