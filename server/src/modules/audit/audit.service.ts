import type { Request } from 'express';

import { AuditEventModel } from '../../models/AuditEvent.model.js';

export async function recordAudit(
  request: Request,
  input: {
    action: string;
    entityType: string;
    entityId?: string;
    summary?: Record<string, unknown>;
  },
) {
  if (!request.organization) return;
  await AuditEventModel.create({
    organizationId: request.organization._id,
    actorMembershipId: request.membership?._id,
    actorUserId: request.user?._id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    requestId: request.requestId,
  });
}
