import type { WeeklyReportStatus } from '@clientflow/shared';
import { isValidObjectId, type FilterQuery } from 'mongoose';

import { ClientModel, type ClientDocument } from '../../models/Client.model.js';
import {
  WeeklyReportModel,
  toWeeklyReportContract,
  type WeeklyReport,
  type WeeklyReportDocument,
} from '../../models/WeeklyReport.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';
import { getClient } from '../clients/client.service.js';
import {
  assertActorPermission,
  projectVisibilityQuery,
  workLogVisibilityQuery,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import { ProjectModel } from '../../models/Project.model.js';
import type {
  CreateWeeklyReportInput,
  UpdateWeeklyReportInput,
} from './report.validation.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireValidReportId(reportId: string) {
  if (!isValidObjectId(reportId)) {
    throw new ApiError(404, 'Report not found.');
  }
}

function reportClient(client: ClientDocument) {
  return {
    id: client._id.toString(),
    name: client.name,
    companyName: client.companyName ?? null,
  };
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

async function aggregateWorkLogs(
  actor: WorkspaceActor,
  clientId: string,
  weekStart: Date,
  weekEnd: Date,
) {
  return WorkLogModel.find({
    ...(await workLogVisibilityQuery(actor)),
    clientId,
    status: { $ne: 'running' },
    workDate: {
      $gte: startOfDay(weekStart),
      $lte: endOfDay(weekEnd),
    },
  }).sort({ workDate: -1, updatedAt: -1 });
}

function summarizeLogs(
  workLogs: Array<{
    title: string;
    durationHours: number;
    billable: boolean;
  }>,
  weekStart: Date,
  weekEnd: Date,
  title: string,
) {
  const totalHours = workLogs.reduce(
    (sum, workLog) => sum + workLog.durationHours,
    0,
  );
  const billableHours = workLogs
    .filter((workLog) => workLog.billable)
    .reduce((sum, workLog) => sum + workLog.durationHours, 0);
  const nonBillableHours = Number((totalHours - billableHours).toFixed(2));
  const reportTitle = title.trim();

  const summary =
    workLogs.length > 0
      ? `${reportTitle} captures ${workLogs.length} work log${workLogs.length === 1 ? '' : 's'} totaling ${totalHours.toFixed(2)} hours between ${weekStart.toLocaleDateString()} and ${weekEnd.toLocaleDateString()}.`
      : `${reportTitle} was created manually for ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}. No work logs were captured in this range.`;
  const highlights = workLogs
    .slice(0, 4)
    .map((workLog) => workLog.title)
    .filter(Boolean);

  return {
    summary,
    highlights,
    totalHours: Number(totalHours.toFixed(2)),
    billableHours: Number(billableHours.toFixed(2)),
    nonBillableHours,
    workLogCount: workLogs.length,
  };
}

async function buildReportPayload(
  actor: WorkspaceActor,
  input: {
    clientId: string;
    title: string;
    weekStart: Date;
    weekEnd: Date;
    summary?: string;
    highlights?: string[];
    status?: WeeklyReportStatus;
  },
) {
  const client = await getClient(actor, input.clientId);
  const workLogs = await aggregateWorkLogs(
    actor,
    client._id.toString(),
    input.weekStart,
    input.weekEnd,
  );
  const totals = summarizeLogs(
    workLogs,
    input.weekStart,
    input.weekEnd,
    input.title,
  );

  return {
    client,
    workLogs,
    payload: {
      clientId: client._id,
      title: input.title.trim(),
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      summary: input.summary?.trim() || totals.summary,
      highlights: input.highlights?.filter(Boolean)?.length
        ? input.highlights.filter(Boolean)
        : totals.highlights,
      status: input.status ?? 'draft',
      workLogCount: totals.workLogCount,
      totalHours: totals.totalHours,
      billableHours: totals.billableHours,
      nonBillableHours: totals.nonBillableHours,
      workLogIds: workLogs.map((workLog) => workLog._id),
    },
  };
}

async function contractsForReports(reports: WeeklyReportDocument[]) {
  const clientIds = [
    ...new Set(reports.map((report) => report.clientId.toString())),
  ];
  const clients = await ClientModel.find({ _id: { $in: clientIds } });
  const clientsById = new Map(
    clients.map((client) => [client._id.toString(), reportClient(client)]),
  );

  return reports.flatMap((report) => {
    const client = clientsById.get(report.clientId.toString());
    return client ? [toWeeklyReportContract(report, client)] : [];
  });
}

async function baseQuery(
  actor: WorkspaceActor,
  filters: {
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<FilterQuery<WeeklyReport>> {
  const visibleClientIds = await ProjectModel.distinct(
    'clientId',
    await projectVisibilityQuery(actor),
  );
  const query: FilterQuery<WeeklyReport> = {
    organizationId: actor.organization._id,
    ...(actor.permissions.includes('worklogs.viewAll')
      ? {}
      : { clientId: { $in: visibleClientIds } }),
  };

  if (filters.clientId) {
    if (!isValidObjectId(filters.clientId)) {
      throw new ApiError(422, 'Select a valid client filter.');
    }
    query.clientId = filters.clientId;
  }

  if (filters.startDate || filters.endDate) {
    const dateClauses: FilterQuery<WeeklyReport>[] = [];
    if (filters.startDate) {
      dateClauses.push({
        weekEnd: { $gte: startOfDay(filters.startDate) },
      } as FilterQuery<WeeklyReport>);
    }
    if (filters.endDate) {
      dateClauses.push({
        weekStart: { $lte: endOfDay(filters.endDate) },
      } as FilterQuery<WeeklyReport>);
    }
    query.$and = dateClauses;
  }

  return query;
}

export async function listWeeklyReports(
  actor: WorkspaceActor,
  filters: {
    search?: string;
    status: WeeklyReportStatus | 'all';
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  assertActorPermission(actor, 'reports.view');
  const reportScope = await baseQuery(actor, {});
  const query: FilterQuery<WeeklyReport> = await baseQuery(actor, filters);

  if (filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { title: search },
      { summary: search },
      { highlights: search },
    ];
  }

  const [reports, statusCounts] = await Promise.all([
    WeeklyReportModel.find(query).sort({ weekStart: -1, updatedAt: -1 }),
    WeeklyReportModel.aggregate<{ _id: WeeklyReportStatus; count: number }>([
      { $match: reportScope },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<WeeklyReportStatus | 'all', number> = {
    all: 0,
    draft: 0,
    final: 0,
  };

  for (const entry of statusCounts) {
    counts[entry._id] = entry.count;
    counts.all += entry.count;
  }

  return {
    reports: await contractsForReports(reports),
    total: reports.length,
    counts,
  };
}

export async function createWeeklyReport(
  actor: WorkspaceActor,
  input: CreateWeeklyReportInput,
) {
  assertActorPermission(actor, 'reports.manage');
  const { client, payload } = await buildReportPayload(actor, input);
  const report = await WeeklyReportModel.create({
    ...payload,
    userId: actor.user._id,
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
  });

  return toWeeklyReportContract(report, reportClient(client));
}

export async function getWeeklyReport(actor: WorkspaceActor, reportId: string) {
  assertActorPermission(actor, 'reports.view');
  requireValidReportId(reportId);
  const report = await WeeklyReportModel.findOne({
    _id: reportId,
    ...(await baseQuery(actor, {})),
  });

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  const client = await getClient(actor, report.clientId.toString());
  return { report, client };
}

export async function updateWeeklyReport(
  actor: WorkspaceActor,
  reportId: string,
  input: UpdateWeeklyReportInput,
) {
  assertActorPermission(actor, 'reports.manage');
  requireValidReportId(reportId);

  const currentReport = await WeeklyReportModel.findOne({
    _id: reportId,
    ...(await baseQuery(actor, {})),
  });

  if (!currentReport) {
    throw new ApiError(404, 'Report not found.');
  }

  const nextClientId = input.clientId ?? currentReport.clientId.toString();
  const nextTitle = input.title ?? currentReport.title;
  const nextWeekStart = input.weekStart ?? currentReport.weekStart;
  const nextWeekEnd = input.weekEnd ?? currentReport.weekEnd;
  const nextStatus = input.status ?? currentReport.status;
  const nextSummary =
    input.summary === undefined ? undefined : input.summary.trim();
  const nextHighlights =
    input.highlights === undefined
      ? undefined
      : input.highlights.filter(Boolean);

  const { client, payload } = await buildReportPayload(actor, {
    clientId: nextClientId,
    title: nextTitle,
    weekStart: nextWeekStart,
    weekEnd: nextWeekEnd,
    summary: nextSummary,
    highlights: nextHighlights,
    status: nextStatus,
  });

  const report = await WeeklyReportModel.findOneAndUpdate(
    { _id: reportId, ...(await baseQuery(actor, {})) },
    {
      $set: {
        ...payload,
        userId: actor.user._id,
        organizationId: actor.organization._id,
      },
    },
    { new: true, runValidators: true },
  );

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  return toWeeklyReportContract(report, reportClient(client));
}

export async function deleteWeeklyReport(
  actor: WorkspaceActor,
  reportId: string,
) {
  assertActorPermission(actor, 'reports.manage');
  requireValidReportId(reportId);
  const report = await WeeklyReportModel.findOneAndDelete({
    _id: reportId,
    ...(await baseQuery(actor, {})),
  });

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }
}
