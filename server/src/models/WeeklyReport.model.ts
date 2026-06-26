import type {
  WeeklyReport as WeeklyReportContract,
  WeeklyReportClient,
  WeeklyReportStatus,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface WeeklyReport {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  clientId: Types.ObjectId;
  title: string;
  weekStart: Date;
  weekEnd: Date;
  summary: string;
  highlights: string[];
  status: WeeklyReportStatus;
  workLogCount: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  workLogIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type WeeklyReportDocument = HydratedDocument<WeeklyReport>;

const weeklyReportSchema = new Schema<WeeklyReport>(
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
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    weekStart: {
      type: Date,
      required: true,
      index: true,
    },
    weekEnd: {
      type: Date,
      required: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 6000,
    },
    highlights: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 8,
        message: 'Weekly reports can include up to 8 highlights.',
      },
    },
    status: {
      type: String,
      enum: ['draft', 'final'],
      default: 'draft',
      required: true,
      index: true,
    },
    workLogCount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalHours: {
      type: Number,
      required: true,
      min: 0,
    },
    billableHours: {
      type: Number,
      required: true,
      min: 0,
    },
    nonBillableHours: {
      type: Number,
      required: true,
      min: 0,
    },
    workLogIds: [{ type: Schema.Types.ObjectId, ref: 'WorkLog' }],
  },
  {
    timestamps: true,
  },
);

weeklyReportSchema.index({ userId: 1, weekStart: -1, updatedAt: -1 });
weeklyReportSchema.index({
  organizationId: 1,
  weekStart: -1,
  updatedAt: -1,
});
weeklyReportSchema.index({ userId: 1, clientId: 1, weekStart: -1 });
weeklyReportSchema.index({ userId: 1, status: 1, updatedAt: -1 });
weeklyReportSchema.index({ userId: 1, title: 1 });
weeklyReportSchema.index({ userId: 1, weekStart: 1, weekEnd: 1 });

export const WeeklyReportModel = model<WeeklyReport>(
  'WeeklyReport',
  weeklyReportSchema,
);

export function toWeeklyReportContract(
  report: WeeklyReportDocument,
  client: WeeklyReportClient,
): WeeklyReportContract {
  return {
    id: report._id.toString(),
    clientId: report.clientId.toString(),
    client,
    title: report.title,
    weekStart: report.weekStart.toISOString(),
    weekEnd: report.weekEnd.toISOString(),
    summary: report.summary,
    highlights: report.highlights,
    status: report.status,
    workLogCount: report.workLogCount,
    totalHours: report.totalHours,
    billableHours: report.billableHours,
    nonBillableHours: report.nonBillableHours,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
