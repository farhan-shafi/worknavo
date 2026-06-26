import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface WorkCategory {
  organizationId: Types.ObjectId;
  name: string;
  color: string;
  defaultBillable: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkCategoryDocument = HydratedDocument<WorkCategory>;

const workCategorySchema = new Schema<WorkCategory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    color: { type: String, default: '#E35D22', maxlength: 20 },
    defaultBillable: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

workCategorySchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const WorkCategoryModel = model<WorkCategory>(
  'WorkCategory',
  workCategorySchema,
);
