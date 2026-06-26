import type { MembershipRole, Permission } from '@clientflow/shared';

import { request } from '../../lib/api-client';

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: MembershipRole;
  jobTitle: string | null;
  status: 'active' | 'suspended';
  weeklyCapacity: number;
  permissionOverrides: { allow: Permission[]; deny: Permission[] };
  permissions: Permission[];
  projectIds: string[];
  assignments: Array<{
    projectId: string;
    assignmentType: 'project_manager' | 'contributor';
    categoryIds: string[];
  }>;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: MembershipRole;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string | null;
}

export const teamApi = {
  list: () => request<{ members: TeamMember[] }>('/members'),
  invitations: () => request<{ invitations: Invitation[] }>('/invitations'),
  resendInvitation: (invitationId: string) =>
    request<{ message: string; acceptUrl: string; delivered: boolean }>(
      `/invitations/${invitationId}/resend`,
      { method: 'POST' },
    ),
  revokeInvitation: (invitationId: string) =>
    request<{ message: string }>(`/invitations/${invitationId}`, {
      method: 'DELETE',
    }),
  invite: (payload: {
    email: string;
    name?: string;
    role: Exclude<MembershipRole, 'owner'>;
    jobTitle?: string;
    mode: 'email' | 'admin_created';
    projectIds: string[];
    permissionOverrides: { allow: Permission[]; deny: Permission[] };
  }) =>
    request<{
      message: string;
      temporaryPassword?: string;
      invitation?: { acceptUrl: string };
    }>('/members/invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    memberId: string,
    payload: {
      role?: Exclude<MembershipRole, 'owner'>;
      jobTitle?: string | null;
      weeklyCapacity?: number;
      permissionOverrides?: { allow: Permission[]; deny: Permission[] };
    },
  ) =>
    request<{ message: string; member: TeamMember }>(`/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  assignProjects: (
    memberId: string,
    assignments: Array<{
      projectId: string;
      assignmentType: 'project_manager' | 'contributor';
      categoryIds: string[];
    }>,
  ) =>
    request<{ message: string }>(`/members/${memberId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    }),
  suspend: (memberId: string) =>
    request<{ message: string }>(`/members/${memberId}/suspend`, {
      method: 'POST',
    }),
  reactivate: (memberId: string) =>
    request<{ message: string }>(`/members/${memberId}/reactivate`, {
      method: 'POST',
    }),
};
