import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createWeeklyReport,
  deleteWeeklyReport,
  downloadWeeklyReport,
  emailWeeklyReport,
  listWeeklyReports,
  showWeeklyReport,
  updateWeeklyReport,
} from './report.controller.js';

export const reportRouter = Router();

reportRouter.use(requireAuth);
reportRouter.route('/').get(listWeeklyReports).post(createWeeklyReport);
reportRouter.get('/:id/pdf', downloadWeeklyReport);
reportRouter.post('/:id/send-email', emailWeeklyReport);
reportRouter
  .route('/:id')
  .get(showWeeklyReport)
  .patch(updateWeeklyReport)
  .delete(deleteWeeklyReport);
