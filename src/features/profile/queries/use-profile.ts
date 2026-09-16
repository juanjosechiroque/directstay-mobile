import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/lib/repositories';

export const profileKeys = {
  all: ['profile'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
};

export function useProfile() {
  const { profile } = useRepositories();
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: () => profile.getCurrentProfile(),
  });
}
