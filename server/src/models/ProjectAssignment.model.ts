import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ProjectAssignment {
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  membershipId: Types.ObjectId;
  assignmentType: 'project_manager' | 'contributor';
  categoryIds: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectAssignmentDocument = HydratedDocument<ProjectAssignment>;

const projectAssignmentSchema = new Schema<ProjectAssignment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
      required: true,
      index: true,
    },
    assignmentType: {
      type: String,
      enum: ['project_manager', 'contributor'],
      default: 'contributor',
      required: true,
    },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'WorkCategory' }],
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);

projectAssignmentSchema.index(
  { organizationId: 1, projectId: 1, membershipId: 1 },
  { unique: true },
);

export const ProjectAssignmentModel = model<ProjectAssignment>(
  'ProjectAssignment',
  projectAssignmentSchema,
);
