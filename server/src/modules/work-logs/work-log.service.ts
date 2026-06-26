import type {
  WorkLogBillingFilter,
  WorkLogClient,
  WorkLogProject,
} from '@clientflow/shared';
import { isValidObjectId, type FilterQuery } from 'mongoose';

import { ClientModel, type ClientDocument } from '../../models/Client.model.js';
import {
  ProjectModel,
  type ProjectDocument,
} from '../../models/Project.model.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';
import { WorkCategoryModel } from '../../models/WorkCategory.model.js';
import { WeeklyReportModel } from '../../models/WeeklyReport.model.js';
import { AuditEventModel } from '../../models/AuditEvent.model.js';
import {
  WorkLogModel,
  toWorkLogContract,
  type WorkLog,
  type WorkLogDocument,
} from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';
import { getClient } from '../clients/client.service.js';
import {
  actorHas,
  assertActorPermission,
  assignedProjectIds,
  sameObjectId,
  workLogVisibilityQuery,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import type {
  CreateWorkLogInput,
  StartWorkLogTimerInput,
  UpdateWorkLogInput,
} from './work-log.validation.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireValidWorkLogId(workLogId: string) {
  if (!isValidObjectId(workLogId)) {
    throw new ApiError(404, 'Work log not found.');
  }
}

function requireValidScopedId(value: string, message: string) {
  if (!isValidObjectId(value)) {
    throw new ApiError(422, message);
  }

  return value;
}

function clientContract(client: ClientDocument): WorkLogClient {
  return {
    id: client._id.toString(),
    name: client.name,
    companyName: client.companyName ?? null,
  };
}

function projectContract(project: ProjectDocument): WorkLogProject {
  return {
    id: project._id.toString(),
    name: project.name,
    currency: project.currency,
  };
}

function visibleWorkLogContract(
  actor: WorkspaceActor,
  workLog: WorkLogDocument,
  client: WorkLogClient,
  project: WorkLogProject,
) {
  const contract = toWorkLogContract(workLog, client, project);
  return actorHas(actor, 'financials.view')
    ? contract
    : { ...contract, hourlyRate: 0, amount: 0 };
}

async function requireAssignedProject(
  actor: WorkspaceActor,
  projectId: string,
) {
  if (!isValidObjectId(projectId)) {
    throw new ApiError(422, 'Select a valid project.');
  }

  const project = await ProjectModel.findOne({
    _id: projectId,
    organizationId: actor.organization._id,
  });

  if (!project) {
    throw new ApiError(422, 'Select a project from your workspace.');
  }

  if (
    !['owner', 'admin'].includes(actor.membership.role) &&
    !actorHas(actor, 'worklogs.viewAll')
  ) {
    const projectIds = await assignedProjectIds(actor);
    if (!projectIds.some((id) => id.toString() === project._id.toString())) {
      throw new ApiError(403, 'You are not assigned to this project.');
    }
  }

  return project;
}

async function requireWorkLogRelations(
  actor: WorkspaceActor,
  clientId: string,
  projectId: string,
  categoryId?: string,
) {
  const [client, project] = await Promise.all([
    getClient(actor, clientId),
    requireAssignedProject(actor, projectId),
  ]);

  if (project.clientId.toString() !== client._id.toString()) {
    throw new ApiError(
      422,
      'Select a project that belongs to the chosen client.',
    );
  }

  const assignment = await ProjectAssignmentModel.findOne({
    organizationId: actor.organization._id,
    projectId: project._id,
    membershipId: actor.membership._id,
    active: true,
  });
  if (
    !categoryId &&
    (project.allowedCategoryIds.length > 0 ||
      (assignment?.categoryIds.length ?? 0) > 0)
  ) {
    throw new ApiError(422, 'Select an allowed work category.');
  }

  let category = null;
  if (categoryId) {
    if (!isValidObjectId(categoryId)) {
      throw new ApiError(422, 'Select a valid work category.');
    }
    const selectedCategory = await WorkCategoryModel.findOne({
      _id: categoryId,
      organizationId: actor.organization._id,
      active: true,
    });
    if (!selectedCategory)
      throw new ApiError(422, 'Select an active work category.');
    category = selectedCategory;
    const projectAllows =
      project.allowedCategoryIds.length === 0 ||
      project.allowedCategoryIds.some((id) => id.toString() === categoryId);
    const assignmentAllows =
      !assignment ||
      assignment.categoryIds.length === 0 ||
      assignment.categoryIds.some((id) => id.toString() === categoryId);
    if (!projectAllows || !assignmentAllows) {
      throw new ApiError(403, 'This category is not allowed for the project.');
    }
  }

  return { client, project, category };
}

async function contractsForWorkLogs(
  actor: WorkspaceActor,
  workLogs: WorkLogDocument[],
) {
  const clientIds = [
    ...new Set(workLogs.map((item) => item.clientId.toString())),
  ];
  const projectIds = [
    ...new Set(workLogs.map((item) => item.projectId.toString())),
  ];
  const [clients, projects] = await Promise.all([
    ClientModel.find({ _id: { $in: clientIds } }),
    ProjectModel.find({ _id: { $in: projectIds } }),
  ]);
  const clientsById = new Map(
    clients.map((client) => [client._id.toString(), clientContract(client)]),
  );
  const projectsById = new Map(
    projects.map((project) => [
      project._id.toString(),
      projectContract(project),
    ]),
  );

  return workLogs.flatMap((workLog) => {
    const client = clientsById.get(workLog.clientId.toString());
    const project = projectsById.get(workLog.projectId.toString());

    if (!client || !project) return [];
    return [visibleWorkLogContract(actor, workLog, client, project)];
  });
}

async function contractForWorkLog(
  actor: WorkspaceActor,
  workLog: WorkLogDocument | null,
) {
  if (!workLog) {
    return null;
  }

  const [client, project] = await Promise.all([
    ClientModel.findById(workLog.clientId),
    ProjectModel.findById(workLog.projectId),
  ]);

  if (!client || !project) {
    return null;
  }

  return visibleWorkLogContract(
    actor,
    workLog,
    clientContract(client),
    projectContract(project),
  );
}

async function baseScopedQuery(
  actor: WorkspaceActor,
  filters: {
    clientId?: string;
    projectId?: string;
    membershipId?: string;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<FilterQuery<WorkLog>> {
  const query: FilterQuery<WorkLog> = {
    ...(await workLogVisibilityQuery(actor)),
    status: { $ne: 'running' },
  };

  if (filters.clientId) {
    query.clientId = requireValidScopedId(
      filters.clientId,
      'Select a valid client filter.',
    );
  }

  if (filters.projectId) {
    query.projectId = requireValidScopedId(
      filters.projectId,
      'Select a valid project filter.',
    );
  }
  if (filters.membershipId) {
    if (
      !actorHas(actor, 'worklogs.viewAll') &&
      !actorHas(actor, 'worklogs.viewProject')
    ) {
      throw new ApiError(403, 'You cannot filter another member’s work logs.');
    }
    query.membershipId = requireValidScopedId(
      filters.membershipId,
      'Select a valid member filter.',
    );
  }
  if (filters.categoryId) {
    query.categoryId = requireValidScopedId(
      filters.categoryId,
      'Select a valid category filter.',
    );
  }

  if (filters.startDate || filters.endDate) {
    query.workDate = {};

    if (filters.startDate) {
      query.workDate.$gte = filters.startDate;
    }

    if (filters.endDate) {
      query.workDate.$lte = filters.endDate;
    }
  }

  return query;
}

async function filteredQuery(
  actor: WorkspaceActor,
  filters: {
    search?: string;
    billable: WorkLogBillingFilter;
    clientId?: string;
    projectId?: string;
    membershipId?: string;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  const query = await baseScopedQuery(actor, filters);

  if (filters.billable === 'billable') {
    query.billable = true;
  } else if (filters.billable === 'non-billable') {
    query.billable = false;
  }

  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { title: search },
      { description: search },
      { category: search },
      { tags: search },
    ];
  }

  return query;
}

function summarizeWorkLogs(
  workLogs: Awaited<ReturnType<typeof contractsForWorkLogs>>,
) {
  return workLogs.reduce(
    (summary, workLog) => {
      summary.totalHours += workLog.durationHours;

      if (workLog.billable) {
        summary.billableHours += workLog.durationHours;
        summary.billableAmount += workLog.amount;
      } else {
        summary.nonBillableHours += workLog.durationHours;
      }

      return summary;
    },
    {
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      billableAmount: 0,
    },
  );
}

function runningTimerQuery(actor: WorkspaceActor): FilterQuery<WorkLog> {
  return {
    organizationId: actor.organization._id,
    membershipId: actor.membership._id,
    status: 'running',
  };
}

function timerDurationHours(startedAt: Date, stoppedAt: Date) {
  const rawHours = (stoppedAt.getTime() - startedAt.getTime()) / 3_600_000;
  return Math.max(0.01, Number(rawHours.toFixed(2)));
}

export async function listWorkLogs(
  actor: WorkspaceActor,
  filters: {
    search?: string;
    billable: WorkLogBillingFilter;
    clientId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  if (
    !actorHas(actor, 'worklogs.viewOwn') &&
    !actorHas(actor, 'worklogs.viewProject') &&
    !actorHas(actor, 'worklogs.viewAll')
  ) {
    throw new ApiError(403, 'You cannot view work logs.');
  }
  const scopedQuery = await baseScopedQuery(actor, filters);
  const query = await filteredQuery(actor, filters);
  const [activeTimerDoc, workLogs, billingCounts] = await Promise.all([
    WorkLogModel.findOne(runningTimerQuery(actor)).sort({ updatedAt: -1 }),
    WorkLogModel.find(query).sort({ workDate: -1, updatedAt: -1 }),
    WorkLogModel.aggregate<{ _id: boolean; count: number }>([
      { $match: scopedQuery },
      { $group: { _id: '$billable', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = {
    all: 0,
    billable: 0,
    nonBillable: 0,
  };

  for (const entry of billingCounts) {
    if (entry._id) {
      counts.billable = entry.count;
    } else {
      counts.nonBillable = entry.count;
    }
    counts.all += entry.count;
  }

  const [contracts, activeTimer] = await Promise.all([
    contractsForWorkLogs(actor, workLogs),
    contractForWorkLog(actor, activeTimerDoc),
  ]);

  return {
    activeTimer,
    workLogs: contracts,
    total: contracts.length,
    counts,
    summary: summarizeWorkLogs(contracts),
  };
}

export async function createWorkLog(
  actor: WorkspaceActor,
  input: CreateWorkLogInput,
) {
  assertActorPermission(actor, 'worklogs.createOwn');
  const { category, client, project } = await requireWorkLogRelations(
    actor,
    input.clientId,
    input.projectId,
    input.categoryId,
  );
  const workLog = await WorkLogModel.create({
    ...input,
    tags: input.tags ?? [],
    userId: actor.user._id,
    organizationId: actor.organization._id,
    membershipId: actor.membership._id,
    createdByUserId: actor.user._id,
    clientId: client._id,
    projectId: project._id,
    ...(category ? { categoryId: category._id, category: category.name } : {}),
    hourlyRate: project.hourlyRate,
    currency: project.currency,
    entryMode: 'manual',
    status: 'completed',
  });

  return visibleWorkLogContract(
    actor,
    workLog,
    clientContract(client),
    projectContract(project),
  );
}

export async function startWorkLogTimer(
  actor: WorkspaceActor,
  input: StartWorkLogTimerInput,
) {
  assertActorPermission(actor, 'worklogs.createOwn');
  const existingTimer = await WorkLogModel.findOne(runningTimerQuery(actor));

  if (existingTimer) {
    throw new ApiError(
      409,
      'Stop the current running timer before starting a new one.',
    );
  }

  const { category, client, project } = await requireWorkLogRelations(
    actor,
    input.clientId,
    input.projectId,
    input.categoryId,
  );
  const startedAt = new Date();
  const workLog = await WorkLogModel.create({
    ...input,
    tags: input.tags ?? [],
    userId: actor.user._id,
    organizationId: actor.organization._id,
    membershipId: actor.membership._id,
    createdByUserId: actor.user._id,
    clientId: client._id,
    projectId: project._id,
    ...(category ? { categoryId: category._id, category: category.name } : {}),
    workDate: startedAt,
    durationHours: 0,
    hourlyRate: project.hourlyRate,
    currency: project.currency,
    entryMode: 'timer',
    status: 'running',
    timerStartedAt: startedAt,
  });

  return visibleWorkLogContract(
    actor,
    workLog,
    clientContract(client),
    projectContract(project),
  );
}

export async function stopWorkLogTimer(actor: WorkspaceActor) {
  assertActorPermission(actor, 'worklogs.createOwn');
  const workLog = await WorkLogModel.findOne(runningTimerQuery(actor));

  if (!workLog || !workLog.timerStartedAt) {
    throw new ApiError(404, 'No running timer was found.');
  }

  const stoppedAt = new Date();
  workLog.timerStoppedAt = stoppedAt;
  workLog.durationHours = timerDurationHours(workLog.timerStartedAt, stoppedAt);
  workLog.status = 'completed';
  workLog.workDate = workLog.timerStartedAt;
  await workLog.save();

  const { client, project } = await requireWorkLogRelations(
    actor,
    workLog.clientId.toString(),
    workLog.projectId.toString(),
    workLog.categoryId?.toString(),
  );

  return visibleWorkLogContract(
    actor,
    workLog,
    clientContract(client),
    projectContract(project),
  );
}

export async function getWorkLog(actor: WorkspaceActor, workLogId: string) {
  requireValidWorkLogId(workLogId);
  const workLog = await WorkLogModel.findOne({
    _id: workLogId,
    ...(await workLogVisibilityQuery(actor)),
  });

  if (!workLog) {
    throw new ApiError(404, 'Work log not found.');
  }

  const { client, project } = await requireWorkLogRelations(
    actor,
    workLog.clientId.toString(),
    workLog.projectId.toString(),
    workLog.categoryId?.toString(),
  );

  return { workLog, client, project };
}

export async function updateWorkLog(
  actor: WorkspaceActor,
  workLogId: string,
  input: UpdateWorkLogInput,
) {
  requireValidWorkLogId(workLogId);

  const currentWorkLog = await WorkLogModel.findOne({
    _id: workLogId,
    ...(await workLogVisibilityQuery(actor)),
  });

  if (!currentWorkLog) {
    throw new ApiError(404, 'Work log not found.');
  }

  if (currentWorkLog.status === 'running') {
    throw new ApiError(409, 'Stop the timer before editing this work log.');
  }

  const ownsLog = sameObjectId(
    currentWorkLog.membershipId,
    actor.membership._id,
  );
  if (
    !(ownsLog && actorHas(actor, 'worklogs.editOwn')) &&
    !actorHas(actor, 'worklogs.manageAll') &&
    !actorHas(actor, 'worklogs.viewProject')
  ) {
    throw new ApiError(403, 'You cannot edit this work log.');
  }

  const finalReport = await WeeklyReportModel.exists({
    organizationId: actor.organization._id,
    status: 'final',
    workLogIds: currentWorkLog._id,
  });
  const locked = Boolean(currentWorkLog.invoiceId || finalReport);
  if (locked && !actorHas(actor, 'worklogs.manageAll')) {
    throw new ApiError(
      409,
      'This work log is locked by a final report or invoice.',
    );
  }

  const { category, client, project } = await requireWorkLogRelations(
    actor,
    input.clientId ?? currentWorkLog.clientId.toString(),
    input.projectId ?? currentWorkLog.projectId.toString(),
    input.categoryId ?? currentWorkLog.categoryId?.toString(),
  );
  const setFields: Record<string, unknown> = {
    clientId: client._id,
    projectId: project._id,
    hourlyRate: project.hourlyRate,
    currency: project.currency,
    ...(category
      ? { categoryId: category._id, category: category.name }
      : input.categoryId === null
        ? { categoryId: undefined, category: undefined }
        : {}),
  };
  const unsetFields: Record<string, 1> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      if (key === 'description' || key === 'category') {
        unsetFields[key] = 1;
      }
    } else {
      setFields[key] = value;
    }
  }

  if (input.tags) {
    setFields.tags = input.tags;
  }

  const workLog = await WorkLogModel.findOneAndUpdate(
    { _id: workLogId, ...(await workLogVisibilityQuery(actor)) },
    {
      $set: setFields,
      ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
    },
    { new: true, runValidators: true },
  );

  if (!workLog) {
    throw new ApiError(404, 'Work log not found.');
  }

  if (locked) {
    await AuditEventModel.create({
      organizationId: actor.organization._id,
      actorMembershipId: actor.membership._id,
      entityType: 'work_log',
      entityId: workLog._id,
      action: 'worklog.locked_correction',
      summary: {
        invoiceId: currentWorkLog.invoiceId?.toString() ?? null,
        finalReport: Boolean(finalReport),
        changedFields: Object.keys(input),
      },
    });
  }

  return visibleWorkLogContract(
    actor,
    workLog,
    clientContract(client),
    projectContract(project),
  );
}

export async function deleteWorkLog(actor: WorkspaceActor, workLogId: string) {
  requireValidWorkLogId(workLogId);
  const existingWorkLog = await WorkLogModel.findOne({
    _id: workLogId,
    ...(await workLogVisibilityQuery(actor)),
  });

  if (!existingWorkLog) {
    throw new ApiError(404, 'Work log not found.');
  }

  if (existingWorkLog.invoiceId) {
    throw new ApiError(
      409,
      'This work log is linked to an invoice and cannot be deleted.',
    );
  }

  const ownsLog = sameObjectId(
    existingWorkLog.membershipId,
    actor.membership._id,
  );
  if (
    !(ownsLog && actorHas(actor, 'worklogs.editOwn')) &&
    !actorHas(actor, 'worklogs.manageAll') &&
    !actorHas(actor, 'worklogs.viewProject')
  ) {
    throw new ApiError(403, 'You cannot delete this work log.');
  }

  const workLog = await WorkLogModel.findOneAndDelete({
    _id: workLogId,
    ...(await workLogVisibilityQuery(actor)),
  });

  if (!workLog) {
    throw new ApiError(404, 'Work log not found.');
  }
}
