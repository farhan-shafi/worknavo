import type {
  MessageResponse,
  WorkLogListResponse,
  WorkLogResponse,
} from '@clientflow/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../utils/api-error.js';
import { workspaceActor } from '../../auth/workspace-context.js';
import {
  createWorkLog as createWorkLogService,
  deleteWorkLog as deleteWorkLogService,
  getWorkLog,
  listWorkLogs as listWorkLogsService,
  startWorkLogTimer as startWorkLogTimerService,
  stopWorkLogTimer as stopWorkLogTimerService,
  updateWorkLog as updateWorkLogService,
} from './work-log.service.js';
import {
  createWorkLogSchema,
  listWorkLogsQuerySchema,
  startWorkLogTimerSchema,
  updateWorkLogSchema,
} from './work-log.validation.js';

function workLogId(request: Request) {
  const id = request.params.id;

  if (typeof id !== 'string') {
    throw new ApiError(404, 'Work log not found.');
  }

  return id;
}

export async function listWorkLogs(request: Request, response: Response) {
  const filters = listWorkLogsQuerySchema.parse(request.query);
  const body: WorkLogListResponse = await listWorkLogsService(
    workspaceActor(request),
    filters,
  );
  response.status(200).json(body);
}

export async function createWorkLog(request: Request, response: Response) {
  const input = createWorkLogSchema.parse(request.body);
  const workLog = await createWorkLogService(workspaceActor(request), input);
  const body: WorkLogResponse = {
    message: 'Work log created successfully.',
    workLog,
  };
  response.status(201).json(body);
}

export async function startWorkLogTimer(request: Request, response: Response) {
  const input = startWorkLogTimerSchema.parse(request.body);
  const workLog = await startWorkLogTimerService(
    workspaceActor(request),
    input,
  );
  const body: WorkLogResponse = {
    message: 'Timer started successfully.',
    workLog,
  };
  response.status(201).json(body);
}

export async function stopWorkLogTimer(request: Request, response: Response) {
  const workLog = await stopWorkLogTimerService(workspaceActor(request));
  const body: WorkLogResponse = {
    message: 'Timer stopped and work log saved.',
    workLog,
  };
  response.status(200).json(body);
}

export async function showWorkLog(request: Request, response: Response) {
  const { workLog, client, project } = await getWorkLog(
    workspaceActor(request),
    workLogId(request),
  );
  const body: WorkLogResponse = {
    workLog: (() => {
      const amount = workLog.billable
        ? Number((workLog.durationHours * workLog.hourlyRate).toFixed(2))
        : 0;
      const canSeeMoney =
        workspaceActor(request).permissions.includes('financials.view');
      return {
        id: workLog._id.toString(),
        clientId: workLog.clientId.toString(),
        projectId: workLog.projectId.toString(),
        invoiceId: workLog.invoiceId?.toString() ?? null,
        client: {
          id: client._id.toString(),
          name: client.name,
          companyName: client.companyName ?? null,
        },
        project: {
          id: project._id.toString(),
          name: project.name,
          currency: project.currency,
        },
        title: workLog.title,
        description: workLog.description ?? null,
        category: workLog.category ?? null,
        categoryId: workLog.categoryId?.toString() ?? null,
        tags: workLog.tags,
        workDate: workLog.workDate.toISOString(),
        durationHours: workLog.durationHours,
        billable: workLog.billable,
        hourlyRate: canSeeMoney ? workLog.hourlyRate : 0,
        currency: workLog.currency,
        amount: canSeeMoney ? amount : 0,
        entryMode: workLog.entryMode,
        status: workLog.status,
        timerStartedAt: workLog.timerStartedAt?.toISOString() ?? null,
        timerStoppedAt: workLog.timerStoppedAt?.toISOString() ?? null,
        createdAt: workLog.createdAt.toISOString(),
        updatedAt: workLog.updatedAt.toISOString(),
      };
    })(),
  };
  response.status(200).json(body);
}

export async function updateWorkLog(request: Request, response: Response) {
  const input = updateWorkLogSchema.parse(request.body);

  if (Object.keys(input).length === 0) {
    throw new ApiError(422, 'Provide at least one work log field to update.');
  }

  const workLog = await updateWorkLogService(
    workspaceActor(request),
    workLogId(request),
    input,
  );
  const body: WorkLogResponse = {
    message: 'Work log updated successfully.',
    workLog,
  };
  response.status(200).json(body);
}

export async function deleteWorkLog(request: Request, response: Response) {
  await deleteWorkLogService(workspaceActor(request), workLogId(request));
  const body: MessageResponse = { message: 'Work log deleted successfully.' };
  response.status(200).json(body);
}
