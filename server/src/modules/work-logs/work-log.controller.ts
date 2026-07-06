import type {
  MessageResponse,
  ScreenshotProofListResponse,
  ScreenshotProofResponse,
  WorkLogListResponse,
  WorkLogResponse,
} from '@clientflow/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../utils/api-error.js';
import { workspaceActor } from '../../auth/workspace-context.js';
import {
  createScreenshotProof as createScreenshotProofService,
  createWorkLog as createWorkLogService,
  deleteScreenshotProof as deleteScreenshotProofService,
  deleteWorkLog as deleteWorkLogService,
  getScreenshotProofFile,
  getWorkLog,
  listScreenshotProofs as listScreenshotProofsService,
  listWorkLogs as listWorkLogsService,
  startWorkLogTimer as startWorkLogTimerService,
  stopWorkLogTimer as stopWorkLogTimerService,
  updateWorkLog as updateWorkLogService,
} from './work-log.service.js';
import {
  createScreenshotProofSchema,
  createWorkLogSchema,
  listWorkLogsQuerySchema,
  startWorkLogTimerSchema,
  stopWorkLogTimerSchema,
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
  const input = stopWorkLogTimerSchema.parse(request.body);
  const workLog = await stopWorkLogTimerService(workspaceActor(request), input);
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
        membershipId: workLog.membershipId.toString(),
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
        timerStartLocation: workLog.timerStartLocation
          ? {
              latitude: workLog.timerStartLocation.latitude,
              longitude: workLog.timerStartLocation.longitude,
              accuracy: workLog.timerStartLocation.accuracy ?? null,
              capturedAt: workLog.timerStartLocation.capturedAt.toISOString(),
            }
          : null,
        timerStopLocation: workLog.timerStopLocation
          ? {
              latitude: workLog.timerStopLocation.latitude,
              longitude: workLog.timerStopLocation.longitude,
              accuracy: workLog.timerStopLocation.accuracy ?? null,
              capturedAt: workLog.timerStopLocation.capturedAt.toISOString(),
            }
          : null,
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

function proofId(request: Request) {
  const id = request.params.proofId;

  if (typeof id !== 'string') {
    throw new ApiError(404, 'Screenshot proof not found.');
  }

  return id;
}

export async function listScreenshotProofs(
  request: Request,
  response: Response,
) {
  const body: ScreenshotProofListResponse = await listScreenshotProofsService(
    workspaceActor(request),
    workLogId(request),
  );
  response.status(200).json(body);
}

export async function createScreenshotProof(
  request: Request,
  response: Response,
) {
  const input = createScreenshotProofSchema.parse(request.body);
  const screenshotProof = await createScreenshotProofService(
    workspaceActor(request),
    workLogId(request),
    input,
  );
  const body: ScreenshotProofResponse = {
    message: 'Screenshot proof captured.',
    screenshotProof,
  };
  response.status(201).json(body);
}

export async function downloadScreenshotProof(
  request: Request,
  response: Response,
) {
  const { absolutePath, proof } = await getScreenshotProofFile(
    workspaceActor(request),
    workLogId(request),
    proofId(request),
  );

  response
    .status(200)
    .type(proof.mimeType)
    .set({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="screenshot-proof-${proof._id.toString()}.${proof.mimeType === 'image/png' ? 'png' : 'jpg'}"`,
    })
    .sendFile(absolutePath);
}

export async function deleteScreenshotProof(
  request: Request,
  response: Response,
) {
  await deleteScreenshotProofService(
    workspaceActor(request),
    workLogId(request),
    proofId(request),
  );
  const body: MessageResponse = {
    message: 'Screenshot proof deleted.',
  };
  response.status(200).json(body);
}
