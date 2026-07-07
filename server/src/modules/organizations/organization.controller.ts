import { planIncludes } from '@clientflow/shared';
import type { Request, Response } from 'express';

import { toOrganizationContract } from '../../models/Organization.model.js';
import { recordAudit } from '../audit/audit.service.js';
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
  updateOrganizationPlanSchema,
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
  const requestedWorkLogRules =
    input.workLogRequireCategory === true ||
    input.workLogRequireDescription === true ||
    (input.workLogMinimumDescriptionLength ?? 0) > 0 ||
    (input.workLogLockAfterDays !== null &&
      input.workLogLockAfterDays !== undefined) ||
    (input.invoiceTimeRoundingMinutes !== undefined &&
      input.invoiceTimeRoundingMinutes > 0);

  if (
    requestedWorkLogRules &&
    !planIncludes(organization.subscriptionPlan, 'workLogRules')
  ) {
    throw new ApiError(
      402,
      'Team plan is required to use work-log rules and invoice rounding.',
    );
  }

  organization.set(input);
  await organization.save();
  response.json({
    message: 'Organization settings saved.',
    organization: toOrganizationContract(organization),
  });
}

export async function updateOrganizationPlan(
  request: Request,
  response: Response,
) {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'settings.manage');
  const input = updateOrganizationPlanSchema.parse(request.body);
  const previousPlan = organization.subscriptionPlan ?? 'free';

  organization.subscriptionPlan = input.subscriptionPlan;
  if (input.subscriptionPlan === 'free') {
    organization.workLogRequireCategory = false;
    organization.workLogRequireDescription = false;
    organization.workLogMinimumDescriptionLength = 0;
    organization.workLogLockAfterDays = undefined;
    organization.invoiceTimeRoundingMinutes = 0;
  }
  await organization.save();

  if (previousPlan !== input.subscriptionPlan) {
    await recordAudit(request, {
      action: 'organization.plan_changed',
      entityType: 'organization',
      entityId: organization._id.toString(),
      summary: {
        previousPlan,
        currentPlan: input.subscriptionPlan,
      },
    });
  }

  response.json({
    message:
      previousPlan === input.subscriptionPlan
        ? `${input.subscriptionPlan.toUpperCase()} plan is already active.`
        : `${input.subscriptionPlan.toUpperCase()} plan is now active.`,
    organization: toOrganizationContract(organization),
  });
}
