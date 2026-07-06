import type {
  ScheduledReportFrequency,
  ScheduledReportRunResponse,
} from '@clientflow/shared';
import { isValidObjectId } from 'mongoose';

import {
  assertActorPermission,
  type WorkspaceActor,
} from '../../auth/workspace-context.js';
import { ClientModel } from '../../models/Client.model.js';
import { NotificationModel } from '../../models/Notification.model.js';
import { OrganizationModel } from '../../models/Organization.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import {
  ScheduledReportModel,
  toScheduledReportContract,
  type ScheduledReportDocument,
} from '../../models/ScheduledReport.model.js';
import {
  WorkLogModel,
  type WorkLogDocument,
} from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';
import { sendScheduledSummaryEmail } from '../email/email.service.js';
import { scheduledSummaryEmailTemplate } from '../email/email.templates.js';
import type {
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
} from './scheduled-report.validation.js';

const runnerLimit = 25;

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function endOfUtcDay(value: Date) {
  const date = startOfUtcDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(value);
}

function defaultNextRunAt(frequency: ScheduledReportFrequency) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(8, 0, 0, 0);

  if (frequency === 'daily') {
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  }

  if (frequency === 'weekly') {
    const day = next.getUTCDay();
    const daysUntilMonday = (8 - day) % 7 || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    return next;
  }

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 8, 0, 0, 0),
  );
}

function nextRunAfter(frequency: ScheduledReportFrequency, from = new Date()) {
  const next = new Date(from);

  if (frequency === 'daily') {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (frequency === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next;
}

function reportPeriod(
  frequency: ScheduledReportFrequency,
  runAt: Date,
): { start: Date; end: Date; label: string } {
  if (frequency === 'daily') {
    const day = addDays(startOfUtcDay(runAt), -1);
    return {
      start: day,
      end: endOfUtcDay(day),
      label: formatDate(day),
    };
  }

  if (frequency === 'weekly') {
    const endDay = addDays(startOfUtcDay(runAt), -1);
    const startDay = addDays(endDay, -6);
    return {
      start: startDay,
      end: endOfUtcDay(endDay),
      label: `${formatDate(startDay)} – ${formatDate(endDay)}`,
    };
  }

  const start = new Date(
    Date.UTC(runAt.getUTCFullYear(), runAt.getUTCMonth() - 1, 1),
  );
  const end = new Date(
    Date.UTC(runAt.getUTCFullYear(), runAt.getUTCMonth(), 1),
  );
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return {
    start,
    end,
    label: `${formatDate(start)} – ${formatDate(end)}`,
  };
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 2000);
  }

  return 'Scheduled report delivery failed.';
}

async function requireClient(actor: WorkspaceActor, clientId: string) {
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

async function contractsForSchedules(schedules: ScheduledReportDocument[]) {
  const clientIds = [
    ...new Set(
      schedules.flatMap((schedule) =>
        schedule.clientId ? [schedule.clientId.toString()] : [],
      ),
    ),
  ];
  const clients = await ClientModel.find({ _id: { $in: clientIds } });
  const clientsById = new Map(
    clients.map((client) => [client._id.toString(), client]),
  );

  return schedules.map((schedule) => {
    const client = schedule.clientId
      ? clientsById.get(schedule.clientId.toString())
      : null;

    return toScheduledReportContract(
      schedule,
      client
        ? {
            id: client._id.toString(),
            name: client.name,
            companyName: client.companyName ?? null,
          }
        : null,
    );
  });
}

async function contractForSchedule(schedule: ScheduledReportDocument) {
  const contract = (await contractsForSchedules([schedule]))[0];

  if (!contract) {
    throw new ApiError(404, 'Scheduled report not found.');
  }

  return contract;
}

async function findSchedule(actor: WorkspaceActor, scheduledReportId: string) {
  if (!isValidObjectId(scheduledReportId)) {
    throw new ApiError(404, 'Scheduled report not found.');
  }

  const schedule = await ScheduledReportModel.findOne({
    _id: scheduledReportId,
    organizationId: actor.organization._id,
  });

  if (!schedule) {
    throw new ApiError(404, 'Scheduled report not found.');
  }

  return schedule;
}

export async function listScheduledReports(actor: WorkspaceActor) {
  assertActorPermission(actor, 'reports.view');
  const schedules = await ScheduledReportModel.find({
    organizationId: actor.organization._id,
  }).sort({ active: -1, nextRunAt: 1, updatedAt: -1 });

  const scheduledReports = await contractsForSchedules(schedules);
  return {
    scheduledReports,
    total: scheduledReports.length,
  };
}

export async function createScheduledReport(
  actor: WorkspaceActor,
  input: CreateScheduledReportInput,
) {
  assertActorPermission(actor, 'reports.manage');
  const client = input.clientId
    ? await requireClient(actor, input.clientId)
    : null;
  const schedule = await ScheduledReportModel.create({
    organizationId: actor.organization._id,
    createdByUserId: actor.user._id,
    membershipId: actor.membership._id,
    ...(client ? { clientId: client._id } : {}),
    name: input.name,
    frequency: input.frequency,
    recipients: input.recipients,
    subject: input.subject,
    active: input.active ?? true,
    nextRunAt: input.nextRunAt ?? defaultNextRunAt(input.frequency),
  });

  return contractForSchedule(schedule);
}

export async function updateScheduledReport(
  actor: WorkspaceActor,
  scheduledReportId: string,
  input: UpdateScheduledReportInput,
) {
  assertActorPermission(actor, 'reports.manage');
  const schedule = await findSchedule(actor, scheduledReportId);
  const setFields: Record<string, unknown> = {};
  const unsetFields: Record<string, 1> = {};

  if (input.name !== undefined) setFields.name = input.name;
  if (input.frequency !== undefined) setFields.frequency = input.frequency;
  if (input.recipients !== undefined) setFields.recipients = input.recipients;
  if (input.active !== undefined) setFields.active = input.active;
  if (input.nextRunAt !== undefined) setFields.nextRunAt = input.nextRunAt;
  if (input.subject !== undefined) {
    setFields.subject = input.subject;
  } else if ('subject' in input) {
    unsetFields.subject = 1;
  }

  if ('clientId' in input) {
    if (input.clientId) {
      const client = await requireClient(actor, input.clientId);
      setFields.clientId = client._id;
    } else {
      unsetFields.clientId = 1;
    }
  }

  if (input.frequency && !input.nextRunAt) {
    setFields.nextRunAt = defaultNextRunAt(input.frequency);
  }

  await schedule.updateOne({
    ...(Object.keys(setFields).length ? { $set: setFields } : {}),
    ...(Object.keys(unsetFields).length ? { $unset: unsetFields } : {}),
  });

  const updated = await ScheduledReportModel.findById(schedule._id);
  if (!updated) {
    throw new ApiError(404, 'Scheduled report not found.');
  }

  return contractForSchedule(updated);
}

export async function deleteScheduledReport(
  actor: WorkspaceActor,
  scheduledReportId: string,
) {
  assertActorPermission(actor, 'reports.manage');
  const schedule = await findSchedule(actor, scheduledReportId);
  await schedule.deleteOne();
}

async function summarizeWorkLogs(
  schedule: ScheduledReportDocument,
  runAt: Date,
) {
  const period = reportPeriod(schedule.frequency, runAt);
  const workLogs = await WorkLogModel.find({
    organizationId: schedule.organizationId,
    ...(schedule.clientId ? { clientId: schedule.clientId } : {}),
    status: 'completed',
    workDate: {
      $gte: period.start,
      $lte: period.end,
    },
  })
    .sort({ workDate: -1, updatedAt: -1 })
    .limit(500);
  const projectIds = [
    ...new Set(workLogs.map((workLog) => workLog.projectId.toString())),
  ];
  const projects = await ProjectModel.find({ _id: { $in: projectIds } });
  const projectsById = new Map(
    projects.map((project) => [project._id.toString(), project.name]),
  );
  const projectHours = new Map<string, { name: string; hours: number }>();
  let totalHours = 0;
  let billableHours = 0;

  for (const workLog of workLogs) {
    totalHours += workLog.durationHours;
    if (workLog.billable) {
      billableHours += workLog.durationHours;
    }

    const projectId = workLog.projectId.toString();
    const project = projectHours.get(projectId) ?? {
      name: projectsById.get(projectId) ?? 'Unknown project',
      hours: 0,
    };
    project.hours += workLog.durationHours;
    projectHours.set(projectId, project);
  }

  return {
    period,
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    topProjects: [...projectHours.values()]
      .sort((first, second) => second.hours - first.hours)
      .slice(0, 8),
    recentWork: workLogs.slice(0, 8).map((workLog: WorkLogDocument) => ({
      title: workLog.title,
      projectName:
        projectsById.get(workLog.projectId.toString()) ?? 'Unknown project',
      hours: workLog.durationHours,
    })),
  };
}

async function deliverSchedule(schedule: ScheduledReportDocument, runAt: Date) {
  const organization = await OrganizationModel.findById(
    schedule.organizationId,
  );

  if (!organization) {
    throw new Error('Scheduled report organization is no longer available.');
  }

  const summary = await summarizeWorkLogs(schedule, runAt);
  const template = scheduledSummaryEmailTemplate({
    organization,
    reportName: schedule.name,
    periodLabel: summary.period.label,
    totalHours: summary.totalHours,
    billableHours: summary.billableHours,
    nonBillableHours: summary.nonBillableHours,
    topProjects: summary.topProjects,
    recentWork: summary.recentWork,
  });
  const subject = schedule.subject?.trim()
    ? `${schedule.subject.trim()} — ${summary.period.label}`
    : template.subject;

  for (const recipient of schedule.recipients) {
    await sendScheduledSummaryEmail({
      recipient,
      subject,
      text: template.text,
      html: template.html,
    });
  }
}

export async function runDueScheduledReports(
  now = new Date(),
): Promise<ScheduledReportRunResponse> {
  const schedules = await ScheduledReportModel.find({
    active: true,
    nextRunAt: { $lte: now },
  })
    .sort({ nextRunAt: 1 })
    .limit(runnerLimit);
  let sent = 0;
  let failed = 0;

  for (const schedule of schedules) {
    try {
      await deliverSchedule(schedule, schedule.nextRunAt);
      await schedule.updateOne({
        $set: {
          lastSentAt: now,
          nextRunAt: nextRunAfter(schedule.frequency, schedule.nextRunAt),
        },
        $unset: { lastError: 1 },
      });
      sent += 1;
    } catch (error) {
      const errorMessage = safeErrorMessage(error);
      await Promise.all([
        schedule.updateOne({
          $set: {
            lastError: errorMessage,
            nextRunAt: nextRunAfter(schedule.frequency, schedule.nextRunAt),
          },
        }),
        NotificationModel.create({
          organizationId: schedule.organizationId,
          recipientMembershipId: schedule.membershipId,
          type: 'scheduled_report_failed',
          title: 'Scheduled report failed',
          message: `${schedule.name} could not be delivered. Check email settings and recipients.`,
          targetUrl: '/app/reports',
        }),
      ]);
      failed += 1;
    }
  }

  return {
    message: `Processed ${schedules.length} scheduled report${schedules.length === 1 ? '' : 's'}.`,
    processed: schedules.length,
    sent,
    failed,
  };
}

export function normalizeSchedulerSecretHeader(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
}
