import type { ProfileRepository } from '@/features/profile/repository';
import type { GuestProfile } from '@/features/profile/types';

import { MOCK_PROFILE } from '../data/profile';
import { clone } from './clone';
import { assertMockSuccess, simulateLatency } from './scenario';

export class MockProfileRepository implements ProfileRepository {
  async getCurrentProfile(): Promise<GuestProfile | null> {
    await simulateLatency();
    assertMockSuccess();
    return clone(MOCK_PROFILE);
  }
}
