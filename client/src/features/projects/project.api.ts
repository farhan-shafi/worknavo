import type {
  MembershipRole,
  MessageResponse,
  ProjectListResponse,
  ProjectResponse,
  ProjectStatus,
} from '@clientflow/shared';

import { request } from '../../lib/api-client';
import { trackEvent } from '../../lib/analytics';
import type { ProjectFormValues } from './project.schemas';

export interface ProjectFilters {
  search: string;
  status: ProjectStatus | 'all';
  clientId: string;
}

export interface ProjectTeamMember {
  membershipId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  role: MembershipRole;
  assignmentType: 'project_manager' | 'contributor';
  categoryIds: string[];
  plannedHoursPerWeek: number | null;
  weeklyCapacity: number;
  status: 'active' | 'suspended';
  projectHoursThisWeek: number;
  totalPlannedHoursThisWeek: number;
  projectPlanRemainingHours: number | null;
  plannedAllocationPercent: number;
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
  team: (projectId: string) =>
    request<{ members: ProjectTeamMember[] }>(`/projects/${projectId}/team`),
  create: async (values: ProjectFormValues) => {
    const response = await request<ProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectInput(values)),
    });
    trackEvent('project_created', {
      has_budget: Boolean(response.project.estimatedBudget),
      status: response.project.status,
    });
    return response;
  },
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
