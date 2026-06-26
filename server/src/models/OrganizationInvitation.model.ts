import type { MembershipRole, Permission } from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface OrganizationInvitation {
  organizationId: Types.ObjectId;
  email: string;
  role: MembershipRole;
  jobTitle?: string;
  projectIds: Types.ObjectId[];
  permissionOverrides: { allow: Permission[]; deny: Permission[] };
  tokenHash?: string;
  expiresAt?: Date;
  invitedByUserId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'revoked';
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationInvitationDocument =
  HydratedDocument<OrganizationInvitation>;

const invitationSchema = new Schema<OrganizationInvitation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    role: {
      type: String,
      enum: [
        'owner',
        'admin',
        'project_manager',
        'finance',
        'member',
        'viewer',
      ],
      default: 'member',
      required: true,
    },
    jobTitle: { type: String, trim: true, maxlength: 100 },
    projectIds: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    permissionOverrides: {
      allow: [{ type: String }],
      deny: [{ type: String }],
    },
    tokenHash: { type: String, select: false },
    expiresAt: Date,
    invitedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending',
      required: true,
      index: true,
    },
    acceptedAt: Date,
  },
  { timestamps: true },
);

invitationSchema.index(
  { organizationId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export const OrganizationInvitationModel = model<OrganizationInvitation>(
  'OrganizationInvitation',
  invitationSchema,
);
