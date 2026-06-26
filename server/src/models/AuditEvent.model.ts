import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface AuditEvent {
  organizationId: Types.ObjectId;
  actorMembershipId?: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  summary?: Record<string, unknown>;
  requestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditEventDocument = HydratedDocument<AuditEvent>;

const auditEventSchema = new Schema<AuditEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    actorMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
    },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    entityType: { type: String, required: true, trim: true, maxlength: 80 },
    entityId: Schema.Types.ObjectId,
    summary: Schema.Types.Mixed,
    requestId: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

auditEventSchema.index({ organizationId: 1, createdAt: -1 });
auditEventSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });

export const AuditEventModel = model<AuditEvent>(
  'AuditEvent',
  auditEventSchema,
);
