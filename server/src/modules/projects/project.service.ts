import type { ProjectClient, ProjectStatus } from '@clientflow/shared';
import { isValidObjectId, type FilterQuery } from 'mongoose';

import { ClientModel, type ClientDocument } from '../../models/Client.model.js';
import {
  ProjectModel,
  toProjectContract,
  type Project,
  type ProjectDocument,
} from '../../models/Project.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';
import {
  assertActorPermission,
  projectVisibilityQuery,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from './project.validation.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireValidProjectId(projectId: string) {
  if (!isValidObjectId(projectId)) {
    throw new ApiError(404, 'Project not found.');
  }
}

function clientContract(client: ClientDocument): ProjectClient {
  return {
    id: client._id.toString(),
    name: client.name,
    companyName: client.companyName ?? null,
  };
}

async function requireOwnedClient(actor: WorkspaceActor, clientId: string) {
  if (!isValidObjectId(clientId)) {
    throw new ApiError(422, 'Select a valid client.');
  }

  const client = await ClientModel.findOne({
    _id: clientId,
    organizationId: actor.organization._id,
  });

  if (!client) {
    throw new ApiError(422, 'Select a client from your workspace.');
  }

  return client;
}

async function contractsForProjects(
  actor: WorkspaceActor,
  projects: ProjectDocument[],
) {
  const clientIds = [
    ...new Set(projects.map((project) => project.clientId.toString())),
  ];
  const clients = await ClientModel.find({ _id: { $in: clientIds } });
  const clientsById = new Map(
    clients.map((client) => [client._id.toString(), clientContract(client)]),
  );

  return projects.flatMap((project) => {
    const client = clientsById.get(project.clientId.toString());
    if (!client) return [];
    const contract = toProjectContract(project, client);
    return actor.permissions.includes('financials.view')
      ? [contract]
      : [{ ...contract, hourlyRate: 0, estimatedBudget: null }];
  });
}

export async function listProjects(
  actor: WorkspaceActor,
  filters: {
    search?: string;
    status: ProjectStatus | 'all';
    clientId?: string;
  },
) {
  assertActorPermission(actor, 'projects.view');
  const baseQuery = await projectVisibilityQuery(actor);
  const query: FilterQuery<Project> = { ...baseQuery };

  if (filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.clientId) {
    if (!isValidObjectId(filters.clientId)) {
      throw new ApiError(422, 'Select a valid client filter.');
    }
    query.clientId = filters.clientId;
  }

  if (filters.search) {
    query.name = new RegExp(escapeRegex(filters.search), 'i');
  }

  const [projects, statusCounts] = await Promise.all([
    ProjectModel.find(query).sort({ updatedAt: -1 }),
    ProjectModel.aggregate<{ _id: ProjectStatus; count: number }>([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<ProjectStatus | 'all', number> = {
    all: 0,
    active: 0,
    paused: 0,
    completed: 0,
    archived: 0,
  };

  for (const entry of statusCounts) {
    counts[entry._id] = entry.count;
    counts.all += entry.count;
  }

  return {
    projects: await contractsForProjects(actor, projects),
    total: projects.length,
    counts,
  };
}

export async function createProject(
  actor: WorkspaceActor,
  input: CreateProjectInput,
) {
  assertActorPermission(actor, 'projects.manage');
  if (!['owner', 'admin'].includes(actor.membership.role)) {
    throw new ApiError(
      403,
      'Only workspace owners and admins can create projects.',
    );
  }
  const client = await requireOwnedClient(actor, input.clientId);
  const project = await ProjectModel.create({
    ...input,
    userId: actor.user._id,
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
    clientId: client._id,
  });

  const contract = toProjectContract(project, clientContract(client));
  return actor.permissions.includes('financials.view')
    ? contract
    : { ...contract, hourlyRate: 0, estimatedBudget: null };
}

export async function getProject(actor: WorkspaceActor, projectId: string) {
  assertActorPermission(actor, 'projects.view');
  requireValidProjectId(projectId);
  const project = await ProjectModel.findOne({
    _id: projectId,
    ...(await projectVisibilityQuery(actor)),
  });

  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }

  const client = await requireOwnedClient(actor, project.clientId.toString());
  return { project, client };
}

export async function updateProject(
  actor: WorkspaceActor,
  projectId: string,
  input: UpdateProjectInput,
) {
  assertActorPermission(actor, 'projects.manage');
  requireValidProjectId(projectId);

  const currentProject = await ProjectModel.findOne({
    _id: projectId,
    ...(await projectVisibilityQuery(actor)),
  });

  if (!currentProject) {
    throw new ApiError(404, 'Project not found.');
  }

  const nextStartDate = Object.hasOwn(input, 'startDate')
    ? input.startDate
    : currentProject.startDate;
  const nextEndDate = Object.hasOwn(input, 'endDate')
    ? input.endDate
    : currentProject.endDate;

  if (
    nextStartDate &&
    nextEndDate &&
    nextEndDate.getTime() < nextStartDate.getTime()
  ) {
    throw new ApiError(422, 'End date must be on or after the start date.');
  }

  const client = await requireOwnedClient(
    actor,
    input.clientId ?? currentProject.clientId.toString(),
  );
  const setFields: Record<string, unknown> = { clientId: client._id };
  const unsetFields: Record<string, 1> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      if (
        key === 'description' ||
        key === 'startDate' ||
        key === 'endDate' ||
        key === 'estimatedBudget'
      ) {
        unsetFields[key] = 1;
      }
    } else {
      setFields[key] = value;
    }
  }

  const project = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...(await projectVisibilityQuery(actor)) },
    {
      $set: setFields,
      ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
    },
    { new: true, runValidators: true },
  );

  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }

  const contract = toProjectContract(project, clientContract(client));
  return actor.permissions.includes('financials.view')
    ? contract
    : { ...contract, hourlyRate: 0, estimatedBudget: null };
}

export async function deleteProject(actor: WorkspaceActor, projectId: string) {
  assertActorPermission(actor, 'projects.manage');
  if (!['owner', 'admin'].includes(actor.membership.role)) {
    throw new ApiError(
      403,
      'Only workspace owners and admins can delete projects.',
    );
  }
  requireValidProjectId(projectId);
  const linkedWorkLogs = await WorkLogModel.exists({
    projectId,
    organizationId: actor.organization._id,
  });

  if (linkedWorkLogs) {
    throw new ApiError(
      409,
      'Delete this project’s work logs before deleting the project.',
    );
  }

  const project = await ProjectModel.findOneAndDelete({
    _id: projectId,
    ...(await projectVisibilityQuery(actor)),
  });

  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }
}
