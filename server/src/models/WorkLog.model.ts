import type {
  Currency,
  WorkLog as WorkLogContract,
  WorkLogApprovalStatus,
  WorkLogClient,
  WorkLogEntryMode,
  WorkLogProject,
  WorkLogStatus,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface WorkLog {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  membershipId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  categoryId?: Types.ObjectId;
  tags: string[];
  workDate: Date;
  durationHours: number;
  billable: boolean;
  hourlyRate: number;
  currency: Currency;
  entryMode: WorkLogEntryMode;
  status: WorkLogStatus;
  approvalStatus: WorkLogApprovalStatus;
  approvalRequestedAt?: Date;
  approvedAt?: Date;
  approvedByMembershipId?: Types.ObjectId;
  rejectionReason?: string;
  timerStartedAt?: Date;
  timerStoppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkLogDocument = HydratedDocument<WorkLog>;

const workLogSchema = new Schema<WorkLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      index: true,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkCategory',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 8,
        message: 'Work logs can include up to 8 tags.',
      },
    },
    workDate: {
      type: Date,
      required: true,
      index: true,
    },
    durationHours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    billable: {
      type: Boolean,
      default: true,
      index: true,
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000,
    },
    currency: {
      type: String,
      enum: ['USD', 'PKR', 'GBP', 'EUR'],
      required: true,
    },
    entryMode: {
      type: String,
      enum: ['manual', 'timer'],
      default: 'manual',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'running'],
      default: 'completed',
      required: true,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
      required: true,
      index: true,
    },
    approvalRequestedAt: Date,
    approvedAt: Date,
    approvedByMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    timerStartedAt: Date,
    timerStoppedAt: Date,
  },
  {
    timestamps: true,
  },
);

workLogSchema.index({ userId: 1, workDate: -1, updatedAt: -1 });
workLogSchema.index({ organizationId: 1, workDate: -1, updatedAt: -1 });
workLogSchema.index({ organizationId: 1, membershipId: 1, workDate: -1 });
workLogSchema.index({ organizationId: 1, projectId: 1, workDate: -1 });
workLogSchema.index({ userId: 1, clientId: 1, workDate: -1 });
workLogSchema.index({ userId: 1, projectId: 1, workDate: -1 });
workLogSchema.index({ userId: 1, billable: 1, workDate: -1 });
workLogSchema.index({ userId: 1, status: 1, updatedAt: -1 });
workLogSchema.index({ userId: 1, title: 1 });

export const WorkLogModel = model<WorkLog>('WorkLog', workLogSchema);

export function toWorkLogContract(
  workLog: WorkLogDocument,
  client: WorkLogClient,
  project: WorkLogProject,
): WorkLogContract {
  return {
    id: workLog._id.toString(),
    clientId: workLog.clientId.toString(),
    projectId: workLog.projectId.toString(),
    membershipId: workLog.membershipId.toString(),
    invoiceId: workLog.invoiceId?.toString() ?? null,
    client,
    project,
    title: workLog.title,
    description: workLog.description ?? null,
    category: workLog.category ?? null,
    categoryId: workLog.categoryId?.toString() ?? null,
    tags: workLog.tags,
    workDate: workLog.workDate.toISOString(),
    durationHours: workLog.durationHours,
    billable: workLog.billable,
    hourlyRate: workLog.hourlyRate,
    currency: workLog.currency,
    amount: workLog.billable
      ? Number((workLog.durationHours * workLog.hourlyRate).toFixed(2))
      : 0,
    entryMode: workLog.entryMode ?? 'manual',
    status: workLog.status ?? 'completed',
    approvalStatus: workLog.approvalStatus ?? 'draft',
    approvalRequestedAt: workLog.approvalRequestedAt?.toISOString() ?? null,
    approvedAt: workLog.approvedAt?.toISOString() ?? null,
    approvedByMembershipId: workLog.approvedByMembershipId?.toString() ?? null,
    rejectionReason: workLog.rejectionReason ?? null,
    timerStartedAt: workLog.timerStartedAt?.toISOString() ?? null,
    timerStoppedAt: workLog.timerStoppedAt?.toISOString() ?? null,
    createdAt: workLog.createdAt.toISOString(),
    updatedAt: workLog.updatedAt.toISOString(),
  };
}
