import { SupabaseBookingRepository } from '@/features/booking/repository/supabase-booking-repository';
import { SupabaseProfileRepository } from '@/features/profile/repository/supabase-profile-repository';
import { SupabasePropertyRepository } from '@/features/property/repository/supabase-property-repository';
import { SupabaseAvailabilityRepository } from '@/features/search/repository/supabase-availability-repository';
import { SupabaseStayRepository } from '@/features/stay/repository/supabase-stay-repository';
import type { Repositories } from '@/lib/repositories';
import type { DatabaseClient } from '@/lib/supabase/client';

/**
 * Composition root for the Supabase-backed data layer.
 *
 * One client and one organization slug are injected into every adapter. Screens, hooks and
 * components see only the repository interfaces, so this is the single place that knows the
 * concrete implementation. Mocks are no longer part of runtime composition.
 */
export function createSupabaseRepositories(
  client: DatabaseClient,
  organizationSlug: string,
): Repositories {
  const booking = new SupabaseBookingRepository(client, organizationSlug);
  return {
    property: new SupabasePropertyRepository(client, organizationSlug),
    availability: new SupabaseAvailabilityRepository(client, organizationSlug),
    booking,
    stay: new SupabaseStayRepository(client, booking),
    profile: new SupabaseProfileRepository(client),
  };
}
