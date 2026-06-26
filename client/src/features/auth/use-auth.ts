import { useQuery } from '@tanstack/react-query';

import { authApi } from './auth.api';

export const sessionQueryKey = ['auth', 'session'] as const;

export function useAuth() {
  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: authApi.me,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    user: session.data?.user ?? null,
    organization: session.data?.organization ?? null,
    membership: session.data?.membership ?? null,
    organizations: session.data?.organizations ?? [],
    permissions: session.data?.membership.permissions ?? [],
    isLoading: session.isLoading,
    isAuthenticated: Boolean(session.data?.user),
    refetch: session.refetch,
  };
}
