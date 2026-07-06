import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createScreenshotProof,
  createWorkLog,
  deleteScreenshotProof,
  deleteWorkLog,
  downloadScreenshotProof,
  listWorkLogs,
  listScreenshotProofs,
  showWorkLog,
  startWorkLogTimer,
  stopWorkLogTimer,
  updateWorkLog,
} from './work-log.controller.js';

export const workLogRouter = Router();

workLogRouter.use(requireAuth);
workLogRouter.post('/timer/start', startWorkLogTimer);
workLogRouter.post('/timer/stop', stopWorkLogTimer);
workLogRouter.route('/').get(listWorkLogs).post(createWorkLog);
workLogRouter
  .route('/:id/screenshot-proofs')
  .get(listScreenshotProofs)
  .post(createScreenshotProof);
workLogRouter.get(
  '/:id/screenshot-proofs/:proofId/file',
  downloadScreenshotProof,
);
workLogRouter.delete('/:id/screenshot-proofs/:proofId', deleteScreenshotProof);
workLogRouter
  .route('/:id')
  .get(showWorkLog)
  .patch(updateWorkLog)
  .delete(deleteWorkLog);
