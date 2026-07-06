import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  approveWorkLog,
  createScreenshotProof,
  createWorkLog,
  deleteScreenshotProof,
  deleteWorkLog,
  downloadScreenshotProof,
  listWorkLogs,
  listScreenshotProofs,
  rejectWorkLog,
  showWorkLog,
  startWorkLogTimer,
  stopWorkLogTimer,
  submitWorkLogForApproval,
  updateWorkLog,
} from './work-log.controller.js';

export const workLogRouter = Router();

workLogRouter.use(requireAuth);
workLogRouter.post('/timer/start', startWorkLogTimer);
workLogRouter.post('/timer/stop', stopWorkLogTimer);
workLogRouter.route('/').get(listWorkLogs).post(createWorkLog);
workLogRouter.post('/:id/submit-approval', submitWorkLogForApproval);
workLogRouter.post('/:id/approve', approveWorkLog);
workLogRouter.post('/:id/reject', rejectWorkLog);
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
