import type {
  MessageResponse,
  ProjectListResponse,
  ProjectResponse,
} from '@clientflow/shared';
import type { Request, Response } from 'express';

import { toProjectContract } from '../../models/Project.model.js';
import { ApiError } from '../../utils/api-error.js';
import { workspaceActor } from '../../auth/workspace-context.js';
import { getClient } from '../clients/client.service.js';
import {
  createProject as createProjectService,
  deleteProject as deleteProjectService,
  getProject,
  listProjects as listProjectsService,
  updateProject as updateProjectService,
} from './project.service.js';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from './project.validation.js';

function routeId(request: Request, key: 'id' | 'clientId') {
  const id = request.params[key];

  if (typeof id !== 'string') {
    throw new ApiError(404, 'Project not found.');
  }

  return id;
}

export async function listProjects(request: Request, response: Response) {
  const filters = listProjectsQuerySchema.parse(request.query);
  const body: ProjectListResponse = await listProjectsService(
    workspaceActor(request),
    filters,
  );
  response.status(200).json(body);
}

export async function listClientProjects(request: Request, response: Response) {
  const actor = workspaceActor(request);
  const clientId = routeId(request, 'clientId');
  await getClient(actor, clientId);
  const filters = listProjectsQuerySchema.parse({
    ...request.query,
    clientId,
  });
  const body: ProjectListResponse = await listProjectsService(actor, filters);
  response.status(200).json(body);
}

export async function createProject(request: Request, response: Response) {
  const input = createProjectSchema.parse(request.body);
  const project = await createProjectService(workspaceActor(request), input);
  const body: ProjectResponse = {
    message: 'Project created successfully.',
    project,
  };
  response.status(201).json(body);
}

export async function showProject(request: Request, response: Response) {
  const { project, client } = await getProject(
    workspaceActor(request),
    routeId(request, 'id'),
  );
  const body: ProjectResponse = {
    project: (() => {
      const contract = toProjectContract(project, {
        id: client._id.toString(),
        name: client.name,
        companyName: client.companyName ?? null,
      });
      return workspaceActor(request).permissions.includes('financials.view')
        ? contract
        : { ...contract, hourlyRate: 0, estimatedBudget: null };
    })(),
  };
  response.status(200).json(body);
}

export async function updateProject(request: Request, response: Response) {
  const input = updateProjectSchema.parse(request.body);

  if (Object.keys(input).length === 0) {
    throw new ApiError(422, 'Provide at least one project field to update.');
  }

  const project = await updateProjectService(
    workspaceActor(request),
    routeId(request, 'id'),
    input,
  );
  const body: ProjectResponse = {
    message: 'Project updated successfully.',
    project,
  };
  response.status(200).json(body);
}

export async function deleteProject(request: Request, response: Response) {
  await deleteProjectService(workspaceActor(request), routeId(request, 'id'));
  const body: MessageResponse = { message: 'Project deleted successfully.' };
  response.status(200).json(body);
}
