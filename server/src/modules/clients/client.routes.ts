import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createClient,
  deleteClient,
  listClients,
  showClient,
  showClientOverview,
  updateClient,
} from './client.controller.js';
import { listClientProjects } from '../projects/project.controller.js';

export const clientRouter = Router();

clientRouter.use(requireAuth);
clientRouter.route('/').get(listClients).post(createClient);
clientRouter.get('/:id/overview', showClientOverview);
clientRouter.get('/:clientId/projects', listClientProjects);
clientRouter
  .route('/:id')
  .get(showClient)
  .patch(updateClient)
  .delete(deleteClient);
