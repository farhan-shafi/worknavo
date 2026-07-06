import type {
  MessageResponse,
  ScheduledReportListResponse,
  ScheduledReportResponse,
} from '@clientflow/shared';
import { Router } from 'express';

import { workspaceActor } from '../../auth/workspace-context.js';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePlanFeature } from '../../middleware/plan.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import {
  createScheduledReport,
  deleteScheduledReport,
  listScheduledReports,
  normalizeSchedulerSecretHeader,
  runDueScheduledReports,
  updateScheduledReport,
} from './scheduled-report.service.js';
import {
  createScheduledReportSchema,
  updateScheduledReportSchema,
} from './scheduled-report.validation.js';

export const scheduledReportRouter = Router();

scheduledReportRouter.post('/run', async (request, response) => {
  const providedSecret = normalizeSchedulerSecretHeader(
    request.headers['x-scheduler-secret'],
  );

  if (env.NODE_ENV === 'production' && !env.SCHEDULE_RUNNER_SECRET) {
    throw new ApiError(
      503,
      'Scheduled report runner is not configured. Add SCHEDULE_RUNNER_SECRET.',
    );
  }

  if (
    env.SCHEDULE_RUNNER_SECRET &&
    providedSecret !== env.SCHEDULE_RUNNER_SECRET
  ) {
    throw new ApiError(401, 'Invalid scheduler secret.');
  }

  const result = await runDueScheduledReports();
  response.status(200).json(result);
});

scheduledReportRouter.use(requireAuth, requirePlanFeature('scheduledReports'));

scheduledReportRouter
  .route('/')
  .get(async (request, response) => {
    const body: ScheduledReportListResponse = await listScheduledReports(
      workspaceActor(request),
    );
    response.status(200).json(body);
  })
  .post(async (request, response) => {
    const input = createScheduledReportSchema.parse(request.body);
    const scheduledReport = await createScheduledReport(
      workspaceActor(request),
      input,
    );
    const body: ScheduledReportResponse = {
      message: 'Scheduled report created successfully.',
      scheduledReport,
    };
    response.status(201).json(body);
  });

scheduledReportRouter
  .route('/:id')
  .patch(async (request, response) => {
    const { id } = request.params;
    if (!id) throw new ApiError(404, 'Scheduled report not found.');
    const input = updateScheduledReportSchema.parse(request.body);
    if (Object.keys(input).length === 0) {
      throw new ApiError(
        422,
        'Provide at least one scheduled report field to update.',
      );
    }
    const scheduledReport = await updateScheduledReport(
      workspaceActor(request),
      id,
      input,
    );
    const body: ScheduledReportResponse = {
      message: 'Scheduled report updated successfully.',
      scheduledReport,
    };
    response.status(200).json(body);
  })
  .delete(async (request, response) => {
    const { id } = request.params;
    if (!id) throw new ApiError(404, 'Scheduled report not found.');
    await deleteScheduledReport(workspaceActor(request), id);
    const body: MessageResponse = {
      message: 'Scheduled report deleted successfully.',
    };
    response.status(200).json(body);
  });
