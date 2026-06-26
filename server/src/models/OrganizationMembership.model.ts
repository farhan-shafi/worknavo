import type {
  Membership as MembershipContract,
  MembershipRole,
  MembershipStatus,
  Permission,
} from '@clientflow/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface OrganizationMembership {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MembershipRole;
  jobTitle?: string;
  status: MembershipStatus;
  reportingManagerId?: Types.ObjectId;
  weeklyCapacity: number;
  permissionOverrides: { allow: Permission[]; deny: Permission[] };
  invitedByUserId?: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationMembershipDocument =
  HydratedDocument<OrganizationMembership>;

const permissionValues: Permission[] = [
  'members.view',
  'members.viewProject',
  'members.manage',
  'members.invite',
  'clients.view',
  'clients.manage',
  'projects.view',
  'projects.manage',
  'projects.assign',
  'categories.manage',
  'worklogs.createOwn',
  'worklogs.viewOwn',
  'worklogs.editOwn',
  'worklogs.viewProject',
  'worklogs.viewAll',
  'worklogs.manageAll',
  'reports.view',
  'reports.manage',
  'invoices.view',
  'invoices.manage',
  'financials.view',
  'analytics.viewTeam',
  'settings.manage',
  'audit.view',
];

const membershipSchema = new Schema<OrganizationMembership>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
      index: true,
    },
    jobTitle: { type: String, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      required: true,
      index: true,
    },
    reportingManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMembership',
    },
    weeklyCapacity: { type: Number, min: 1, max: 168, default: 40 },
    permissionOverrides: {
      allow: [{ type: String, enum: permissionValues }],
      deny: [{ type: String, enum: permissionValues }],
    },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ organizationId: 1, role: 1, status: 1 });

export const OrganizationMembershipModel = model<OrganizationMembership>(
  'OrganizationMembership',
  membershipSchema,
);

export function toMembershipContract(
  membership: OrganizationMembershipDocument,
  permissions: Permission[],
): MembershipContract {
  return {
    id: membership._id.toString(),
    organizationId: membership.organizationId.toString(),
    userId: membership.userId.toString(),
    role: membership.role,
    jobTitle: membership.jobTitle ?? null,
    status: membership.status,
    reportingManagerId: membership.reportingManagerId?.toString() ?? null,
    weeklyCapacity: membership.weeklyCapacity,
    permissions,
    permissionOverrides: {
      allow: membership.permissionOverrides?.allow ?? [],
      deny: membership.permissionOverrides?.deny ?? [],
    },
    joinedAt: membership.joinedAt.toISOString(),
  };
}
