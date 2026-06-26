import type { Request, Response } from 'express';

import { toOrganizationContract } from '../../models/Organization.model.js';
import { toAuthUser } from '../../models/User.model.js';
import { ApiError } from '../../utils/api-error.js';
import {
  createOrganizationForUser,
  organizationSummaries,
  requireOrganizationContext,
  requirePermission,
  sessionWorkspace,
} from './organization.service.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from './organization.validation.js';

export async function listOrganizations(request: Request, response: Response) {
  if (!request.user) throw new ApiError(401, 'Log in to continue.');
  response.json({ organizations: await organizationSummaries(request.user) });
}

export function currentOrganization(request: Request, response: Response) {
  const { organization } = requireOrganizationContext(request);
  response.json({ organization: toOrganizationContract(organization) });
}

export async function createOrganization(request: Request, response: Response) {
  if (!request.user) throw new ApiError(401, 'Log in to continue.');
  const input = createOrganizationSchema.parse(request.body);
  const workspace = await createOrganizationForUser(request.user, input);
  const session = await sessionWorkspace(
    request.user,
    workspace.organization._id.toString(),
  );
  response.status(201).json({
    message: 'Workspace created successfully.',
    user: toAuthUser(request.user),
    ...session.contract,
  });
}

export async function updateOrganization(request: Request, response: Response) {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'settings.manage');
  const input = updateOrganizationSchema.parse(request.body);
  organization.set(input);
  await organization.save();
  response.json({
    message: 'Organization settings saved.',
    organization: toOrganizationContract(organization),
  });
}
