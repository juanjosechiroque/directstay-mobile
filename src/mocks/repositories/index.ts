import type { Repositories } from '@/lib/repositories';

import { MockAvailabilityRepository } from './availability-repository';
import { MockBookingRepository } from './booking-repository';
import { MockProfileRepository } from './profile-repository';
import { MockPropertyRepository } from './property-repository';
import { MockStayRepository } from './stay-repository';

/**
 * Single place where the mock bundle satisfies the repository contracts. Replacing this
 * with Supabase-backed implementations is the only change needed at the composition
 * root; screens, hooks and components stay untouched.
 */
const propertyRepository = new MockPropertyRepository();
const bookingRepository = new MockBookingRepository();

export const mockRepositories: Repositories = {
  property: propertyRepository,
  availability: new MockAvailabilityRepository(),
  booking: bookingRepository,
  stay: new MockStayRepository(bookingRepository, propertyRepository),
  profile: new MockProfileRepository(),
};

export {
  getMockScenario,
  setMockLatencyEnabled,
  setMockScenario,
  subscribeMockScenario,
} from './scenario';
export type { MockScenario } from './scenario';
