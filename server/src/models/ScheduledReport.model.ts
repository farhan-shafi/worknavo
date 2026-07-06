import type {
  ScheduledReport as ScheduledReportContract,
  ScheduledReportFrequency,
  WeeklyReportClient,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ScheduledReport {
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  membershipId: Types.ObjectId;
  clientId?: Types.ObjectId;
  name: string;
  frequency: ScheduledReportFrequency;
  recipients: string[];
  subject?: string;
  active: boolean;
  nextRunAt: Date;
  lastSentAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledReportDocument = HydratedDocument<ScheduledReport>;

const scheduledReportSchema = new Schema<ScheduledReport>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },
    recipients: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0 && value.length <= 10,
        message: 'Scheduled reports can include 1 to 10 recipients.',
      },
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastSentAt: Date,
    lastError: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true },
);

scheduledReportSchema.index({
  active: 1,
  nextRunAt: 1,
  organizationId: 1,
});
scheduledReportSchema.index({ organizationId: 1, updatedAt: -1 });

export const ScheduledReportModel = model<ScheduledReport>(
  'ScheduledReport',
  scheduledReportSchema,
);

export function toScheduledReportContract(
  scheduledReport: ScheduledReportDocument,
  client: WeeklyReportClient | null,
): ScheduledReportContract {
  return {
    id: scheduledReport._id.toString(),
    clientId: scheduledReport.clientId?.toString() ?? null,
    client,
    name: scheduledReport.name,
    frequency: scheduledReport.frequency,
    recipients: scheduledReport.recipients,
    subject: scheduledReport.subject ?? null,
    active: scheduledReport.active,
    nextRunAt: scheduledReport.nextRunAt.toISOString(),
    lastSentAt: scheduledReport.lastSentAt?.toISOString() ?? null,
    lastError: scheduledReport.lastError ?? null,
    createdAt: scheduledReport.createdAt.toISOString(),
    updatedAt: scheduledReport.updatedAt.toISOString(),
  };
}
