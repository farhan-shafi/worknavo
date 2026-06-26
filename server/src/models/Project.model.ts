import type {
  Currency,
  Project as ProjectContract,
  ProjectClient,
  ProjectStatus,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface Project {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  status: ProjectStatus;
  hourlyRate: number;
  currency: Currency;
  startDate?: Date;
  endDate?: Date;
  estimatedBudget?: number;
  allowedCategoryIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectDocument = HydratedDocument<Project>;

const projectSchema = new Schema<Project>(
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active',
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
    startDate: Date,
    endDate: Date,
    estimatedBudget: {
      type: Number,
      min: 0,
      max: 1_000_000_000,
    },
    allowedCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'WorkCategory' }],
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ userId: 1, status: 1, updatedAt: -1 });
projectSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
projectSchema.index({ organizationId: 1, clientId: 1, updatedAt: -1 });
projectSchema.index({ userId: 1, clientId: 1, updatedAt: -1 });
projectSchema.index({ userId: 1, name: 1 });

export const ProjectModel = model<Project>('Project', projectSchema);

export function toProjectContract(
  project: ProjectDocument,
  client: ProjectClient,
): ProjectContract {
  return {
    id: project._id.toString(),
    clientId: project.clientId.toString(),
    client,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    hourlyRate: project.hourlyRate,
    currency: project.currency,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    estimatedBudget: project.estimatedBudget ?? null,
    allowedCategoryIds: project.allowedCategoryIds.map(String),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
