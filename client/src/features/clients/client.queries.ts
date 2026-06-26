import { useQuery } from '@tanstack/react-query';

import { clientApi, type ClientFilters } from './client.api';

export const clientQueryKeys = {
  all: ['clients'] as const,
  list: (filters: ClientFilters) =>
    [...clientQueryKeys.all, 'list', filters] as const,
  detail: (clientId: string) =>
    [...clientQueryKeys.all, 'detail', clientId] as const,
  overview: (clientId: string) =>
    [...clientQueryKeys.all, 'overview', clientId] as const,
};

export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: clientQueryKeys.list(filters),
    queryFn: () => clientApi.list(filters),
  });
}

export function useClientOverview(clientId: string | undefined) {
  return useQuery({
    queryKey: clientQueryKeys.overview(clientId ?? ''),
    queryFn: () => clientApi.overview(clientId ?? ''),
    enabled: Boolean(clientId),
  });
}
