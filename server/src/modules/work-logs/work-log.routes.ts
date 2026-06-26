import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createWorkLog,
  deleteWorkLog,
  listWorkLogs,
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
  .route('/:id')
  .get(showWorkLog)
  .patch(updateWorkLog)
  .delete(deleteWorkLog);
