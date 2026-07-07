import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createOrganization,
  currentOrganization,
  listOrganizations,
  updateOrganization,
  updateOrganizationPlan,
} from './organization.controller.js';

export const organizationRouter = Router();
organizationRouter.use(requireAuth);
organizationRouter.route('/').get(listOrganizations).post(createOrganization);
organizationRouter
  .route('/current')
  .get(currentOrganization)
  .patch(updateOrganization);
organizationRouter.patch('/current/plan', updateOrganizationPlan);
