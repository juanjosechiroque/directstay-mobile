import type { GuestProfile } from '@/features/profile/types';

import { DEMO_PROFILE_ID } from './property';

/**
 * DEMO / MOCK FIXTURE DATA (tests only) — local demo profile. Not used at runtime; the
 * Supabase adapter reads the owner-scoped `profiles` row from an authenticated session.
 */
export const MOCK_PROFILE: GuestProfile = {
  id: DEMO_PROFILE_ID,
  displayName: 'Valeria Quispe',
  email: 'valeria.demo@directstay.test',
  phone: '+51 999 000 111',
  memberSince: '2026-01-15',
};
