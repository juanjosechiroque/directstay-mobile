import type { DemoProfile } from '@/features/profile/types';

import { DEMO_PROFILE_ID } from './property';

/**
 * DEMO / MOCK DATA ONLY — local demo profile/session. No real authentication exists.
 * A future SupabaseProfileRepository would read the owner-scoped `profiles` row instead.
 */
export const MOCK_PROFILE: DemoProfile = {
  id: DEMO_PROFILE_ID,
  displayName: 'Valeria Quispe',
  email: 'valeria.demo@directstay.test',
  phone: '+51 999 000 111',
  memberSince: '2026-01-15',
};
