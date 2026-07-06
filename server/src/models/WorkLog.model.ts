import type {
  Currency,
  WorkLog as WorkLogContract,
  WorkLogClient,
  WorkLogEntryMode,
  WorkLogProject,
  WorkLogStatus,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

interface LocationProofDocument {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  capturedAt: Date;
}

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
  timerStartedAt?: Date;
  timerStoppedAt?: Date;
  timerStartLocation?: LocationProofDocument;
  timerStopLocation?: LocationProofDocument;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkLogDocument = HydratedDocument<WorkLog>;

const locationProofSchema = new Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    capturedAt: { type: Date, required: true },
  },
  { _id: false },
);

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
    timerStartedAt: Date,
    timerStoppedAt: Date,
    timerStartLocation: locationProofSchema,
    timerStopLocation: locationProofSchema,
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
    timerStartedAt: workLog.timerStartedAt?.toISOString() ?? null,
    timerStoppedAt: workLog.timerStoppedAt?.toISOString() ?? null,
    timerStartLocation: workLog.timerStartLocation
      ? {
          latitude: workLog.timerStartLocation.latitude,
          longitude: workLog.timerStartLocation.longitude,
          accuracy: workLog.timerStartLocation.accuracy ?? null,
          capturedAt: workLog.timerStartLocation.capturedAt.toISOString(),
        }
      : null,
    timerStopLocation: workLog.timerStopLocation
      ? {
          latitude: workLog.timerStopLocation.latitude,
          longitude: workLog.timerStopLocation.longitude,
          accuracy: workLog.timerStopLocation.accuracy ?? null,
          capturedAt: workLog.timerStopLocation.capturedAt.toISOString(),
        }
      : null,
    createdAt: workLog.createdAt.toISOString(),
    updatedAt: workLog.updatedAt.toISOString(),
  };
}
