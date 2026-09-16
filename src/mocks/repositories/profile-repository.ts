import type { ProfileRepository } from '@/features/profile/repository';
import type { DemoProfile } from '@/features/profile/types';

import { MOCK_PROFILE } from '../data/profile';
import { clone } from './clone';
import { assertMockSuccess, simulateLatency } from './scenario';

export class MockProfileRepository implements ProfileRepository {
  async getCurrentProfile(): Promise<DemoProfile> {
    await simulateLatency();
    assertMockSuccess();
    return clone(MOCK_PROFILE);
  }
}
