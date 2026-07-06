import type { Currency } from '@clientflow/shared';
import type { Types } from 'mongoose';

import { resolvePermissions } from '../../auth/permissions.js';
import { NotificationModel } from '../../models/Notification.model.js';
import { OrganizationMembershipModel } from '../../models/OrganizationMembership.model.js';
import type { OrganizationDocument } from '../../models/Organization.model.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';
import {
  ProjectModel,
  type ProjectDocument,
} from '../../models/Project.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';

const budgetThresholds = [50, 80, 100] as const;

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}

async function billableProjectValue(project: ProjectDocument) {
  const [summary] = await WorkLogModel.aggregate<{ total: number }>([
    {
      $match: {
        organizationId: project.organizationId,
        projectId: project._id,
        billable: true,
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ['$durationHours', '$hourlyRate'] } },
      },
    },
  ]);

  return Number((summary?.total ?? 0).toFixed(2));
}

async function budgetAlertRecipients(project: ProjectDocument) {
  const managerAssignments = await ProjectAssignmentModel.find({
    organizationId: project.organizationId,
    projectId: project._id,
    assignmentType: 'project_manager',
    active: true,
  }).select('membershipId');
  const managerIds = managerAssignments.map(
    (assignment) => assignment.membershipId,
  );
  const memberships = await OrganizationMembershipModel.find({
    organizationId: project.organizationId,
    status: 'active',
    $or: [
      { role: { $in: ['owner', 'admin', 'finance'] } },
      { _id: { $in: managerIds } },
    ],
  });

  return memberships.filter((membership) =>
    resolvePermissions(
      membership.role,
      membership.permissionOverrides,
    ).includes('financials.view'),
  );
}

export async function evaluateProjectBudgetAlerts(
  organization: OrganizationDocument,
  projectId: Types.ObjectId | string,
) {
  const project = await ProjectModel.findOne({
    _id: projectId,
    organizationId: organization._id,
  });

  const budget = project?.estimatedBudget ?? 0;
  if (!project || budget <= 0) {
    return;
  }

  const used = await billableProjectValue(project);
  const percentUsed = (used / budget) * 100;
  const pendingThresholds = budgetThresholds.filter(
    (threshold) =>
      percentUsed >= threshold &&
      !project.budgetAlertThresholdsSent.includes(threshold),
  );

  if (pendingThresholds.length === 0) {
    return;
  }

  const recipients = await budgetAlertRecipients(project);
  if (recipients.length === 0) {
    return;
  }

  for (const threshold of pendingThresholds) {
    const update = await ProjectModel.updateOne(
      {
        _id: project._id,
        organizationId: organization._id,
        budgetAlertThresholdsSent: { $ne: threshold },
      },
      { $addToSet: { budgetAlertThresholdsSent: threshold } },
    );

    if (update.modifiedCount === 0) {
      continue;
    }

    await NotificationModel.insertMany(
      recipients.map((membership) => ({
        organizationId: organization._id,
        recipientMembershipId: membership._id,
        type: 'project_budget_alert',
        title: `${project.name} budget ${threshold}% used`,
        message: `${project.name} has used ${Math.round(percentUsed)}% of its budget (${formatMoney(
          used,
          project.currency,
        )} of ${formatMoney(budget, project.currency)}).`,
        targetUrl: '/app/projects',
      })),
    );
  }
}
