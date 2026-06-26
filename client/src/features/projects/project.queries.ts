import { useQuery } from '@tanstack/react-query';

import { projectApi, type ProjectFilters } from './project.api';

export const projectQueryKeys = {
  all: ['projects'] as const,
  list: (filters: ProjectFilters) =>
    [...projectQueryKeys.all, 'list', filters] as const,
  forClient: (clientId: string) =>
    [...projectQueryKeys.all, 'client', clientId] as const,
  detail: (projectId: string) =>
    [...projectQueryKeys.all, 'detail', projectId] as const,
};

export function useProjects(filters: ProjectFilters) {
  return useQuery({
    queryKey: projectQueryKeys.list(filters),
    queryFn: () => projectApi.list(filters),
  });
}

export function useClientProjects(clientId: string) {
  return useQuery({
    queryKey: projectQueryKeys.forClient(clientId),
    queryFn: () => projectApi.forClient(clientId),
    enabled: Boolean(clientId),
  });
}
