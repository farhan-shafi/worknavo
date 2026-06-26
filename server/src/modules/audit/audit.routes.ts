import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { AuditEventModel } from '../../models/AuditEvent.model.js';
import {
  requireOrganizationContext,
  requirePermission,
} from '../organizations/organization.service.js';

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.get('/', async (request, response) => {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'audit.view');
  const events = await AuditEventModel.find({
    organizationId: organization._id,
  })
    .sort({ createdAt: -1 })
    .limit(200);
  response.json({
    events: events.map((event) => ({
      id: event._id.toString(),
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId?.toString() ?? null,
      summary: event.summary ?? null,
      requestId: event.requestId ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
  });
});
