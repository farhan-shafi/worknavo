import type {
  MessageResponse,
  ProjectListResponse,
  ProjectResponse,
  ProjectStatus,
} from '@clientflow/shared';

import { request } from '../../lib/api-client';
import type { ProjectFormValues } from './project.schemas';

export interface ProjectFilters {
  search: string;
  status: ProjectStatus | 'all';
  clientId: string;
}

function queryString(filters: ProjectFilters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.clientId) {
    params.set('clientId', filters.clientId);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function projectInput(values: ProjectFormValues) {
  return {
    ...values,
    description: values.description?.trim() || null,
    hourlyRate: Number(values.hourlyRate),
    estimatedBudget: values.estimatedBudget
      ? Number(values.estimatedBudget)
      : null,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
  };
}

export const projectApi = {
  list: (filters: ProjectFilters) =>
    request<ProjectListResponse>(`/projects${queryString(filters)}`),
  forClient: (clientId: string) =>
    request<ProjectListResponse>(`/clients/${clientId}/projects`),
  get: (projectId: string) =>
    request<ProjectResponse>(`/projects/${projectId}`),
  create: (values: ProjectFormValues) =>
    request<ProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectInput(values)),
    }),
  update: (projectId: string, values: ProjectFormValues) =>
    request<ProjectResponse>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(projectInput(values)),
    }),
  delete: (projectId: string) =>
    request<MessageResponse>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),
};
