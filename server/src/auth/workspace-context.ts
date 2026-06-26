import type { Permission } from '@clientflow/shared';
import type { Request } from 'express';
import type { FilterQuery, Types } from 'mongoose';

import type { OrganizationMembershipDocument } from '../models/OrganizationMembership.model.js';
import type { OrganizationDocument } from '../models/Organization.model.js';
import { ProjectAssignmentModel } from '../models/ProjectAssignment.model.js';
import type { Project } from '../models/Project.model.js';
import type { UserDocument } from '../models/User.model.js';
import type { WorkLog } from '../models/WorkLog.model.js';
import { ApiError } from '../utils/api-error.js';

export interface WorkspaceActor {
  user: UserDocument;
  organization: OrganizationDocument;
  membership: OrganizationMembershipDocument;
  permissions: Permission[];
}

export function workspaceActor(request: Request): WorkspaceActor {
  if (
    !request.user ||
    !request.organization ||
    !request.membership ||
    !request.permissions
  ) {
    throw new ApiError(401, 'Select an active workspace to continue.');
  }

  return {
    user: request.user,
    organization: request.organization,
    membership: request.membership,
    permissions: request.permissions,
  };
}

export function actorHas(actor: WorkspaceActor, permission: Permission) {
  return actor.permissions.includes(permission);
}

export function assertActorPermission(
  actor: WorkspaceActor,
  permission: Permission,
) {
  if (!actorHas(actor, permission)) {
    throw new ApiError(
      403,
      'You do not have permission to perform this action.',
    );
  }
}

function allProjectAccess(actor: WorkspaceActor) {
  return (
    ['owner', 'admin'].includes(actor.membership.role) ||
    actorHas(actor, 'worklogs.viewAll') ||
    actorHas(actor, 'invoices.manage')
  );
}

async function activeProjectAssignmentIds(
  actor: WorkspaceActor,
  assignmentType?: 'project_manager' | 'contributor',
) {
  const now = new Date();
  const assignments = await ProjectAssignmentModel.find({
    organizationId: actor.organization._id,
    membershipId: actor.membership._id,
    active: true,
    ...(assignmentType ? { assignmentType } : {}),
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
    $and: [
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ],
  }).select('projectId');

  return assignments.map((assignment) => assignment.projectId);
}

export async function assignedProjectIds(actor: WorkspaceActor) {
  return activeProjectAssignmentIds(actor);
}

export async function managedProjectIds(actor: WorkspaceActor) {
  return activeProjectAssignmentIds(actor, 'project_manager');
}

export async function projectVisibilityQuery(
  actor: WorkspaceActor,
): Promise<FilterQuery<Project>> {
  if (allProjectAccess(actor)) {
    return { organizationId: actor.organization._id };
  }

  if (actor.membership.role === 'project_manager') {
    return {
      organizationId: actor.organization._id,
      _id: { $in: await managedProjectIds(actor) },
    };
  }

  return {
    organizationId: actor.organization._id,
    _id: { $in: await assignedProjectIds(actor) },
  };
}

export async function workLogVisibilityQuery(
  actor: WorkspaceActor,
): Promise<FilterQuery<WorkLog>> {
  if (actorHas(actor, 'worklogs.viewAll')) {
    return { organizationId: actor.organization._id };
  }

  if (actorHas(actor, 'worklogs.viewProject')) {
    return {
      organizationId: actor.organization._id,
      projectId: {
        $in:
          actor.membership.role === 'project_manager'
            ? await managedProjectIds(actor)
            : await assignedProjectIds(actor),
      },
    };
  }

  return {
    organizationId: actor.organization._id,
    membershipId: actor.membership._id,
  };
}

export function organizationOwnership(actor: WorkspaceActor) {
  return {
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
  };
}

export function sameObjectId(
  first: Types.ObjectId | string | undefined,
  second: Types.ObjectId | string | undefined,
) {
  return Boolean(first && second && first.toString() === second.toString());
}
