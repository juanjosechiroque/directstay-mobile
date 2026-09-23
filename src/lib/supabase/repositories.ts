import { SupabaseBookingRepository } from '@/features/booking/repository/supabase-booking-repository';
import { SupabasePropertyRepository } from '@/features/property/repository/supabase-property-repository';
import { SupabaseAvailabilityRepository } from '@/features/search/repository/supabase-availability-repository';
import { SupabaseStayRepository } from '@/features/stay/repository/supabase-stay-repository';
import type { Repositories } from '@/lib/repositories';
import type { DatabaseClient } from '@/lib/supabase/client';

/**
 * Composition root for the Supabase-backed data layer.
 *
 * A shared client and organization slug keep every adapter scoped consistently. Features
 * depend on repository interfaces, while this module selects the Supabase implementations.
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
  };
}
