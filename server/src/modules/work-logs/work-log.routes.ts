import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  approveWorkLog,
  createWorkLog,
  deleteWorkLog,
  listWorkLogs,
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
  .route('/:id')
  .get(showWorkLog)
  .patch(updateWorkLog)
  .delete(deleteWorkLog);
