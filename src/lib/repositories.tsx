import { createContext, useContext, type ReactNode } from 'react';

import type { BookingRepository } from '@/features/booking/repository';
import type { ProfileRepository } from '@/features/profile/repository';
import type { PropertyRepository } from '@/features/property/repository';
import type { AvailabilityRepository } from '@/features/search/repository';
import type { StayRepository } from '@/features/stay/repository';

/**
 * Composition root for data access.
 *
 * Screens and query hooks resolve repositories from this context, so the concrete
 * implementation is injected once at the root layout. Swapping the mock bundle for
 * Supabase-backed repositories is a single change here — no screen, hook or component
 * needs to change.
 */
export interface Repositories {
  property: PropertyRepository;
  availability: AvailabilityRepository;
  booking: BookingRepository;
  stay: StayRepository;
  profile: ProfileRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoryContext);
  if (!repositories) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return repositories;
}
