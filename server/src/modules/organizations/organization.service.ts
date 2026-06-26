import type {
  MembershipRole,
  OrganizationSummary,
  Permission,
  WorkspaceType,
} from '@clientflow/shared';
import { Types } from 'mongoose';

import { resolvePermissions } from '../../auth/permissions.js';
import { ClientModel } from '../../models/Client.model.js';
import { EmailLogModel } from '../../models/EmailLog.model.js';
import { InvoiceModel } from '../../models/Invoice.model.js';
import {
  OrganizationMembershipModel,
  toMembershipContract,
  type OrganizationMembershipDocument,
} from '../../models/OrganizationMembership.model.js';
import {
  OrganizationModel,
  toOrganizationContract,
  type OrganizationDocument,
} from '../../models/Organization.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import type { UserDocument } from '../../models/User.model.js';
import { WeeklyReportModel } from '../../models/WeeklyReport.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';

function slugBase(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'workspace'
  );
}

async function uniqueSlug(value: string) {
  const base = slugBase(value);
  let slug = base;
  let suffix = 1;

  while (await OrganizationModel.exists({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

async function migrateLegacyRecords(
  user: UserDocument,
  organization: OrganizationDocument,
  membership: OrganizationMembershipDocument,
) {
  const ownership = {
    organizationId: organization._id,
    createdByUserId: user._id,
  };

  await Promise.all([
    ClientModel.updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      { $set: ownership },
    ),
    ProjectModel.updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      { $set: ownership },
    ),
    WeeklyReportModel.updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      { $set: ownership },
    ),
    InvoiceModel.updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      { $set: ownership },
    ),
    EmailLogModel.updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      { $set: ownership },
    ),
    WorkLogModel.updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      {
        $set: {
          ...ownership,
          membershipId: membership._id,
        },
      },
    ),
  ]);
}

export async function createOrganizationForUser(
  user: UserDocument,
  input: { name?: string; workspaceType?: WorkspaceType } = {},
) {
  const name =
    input.name?.trim() ||
    user.businessName?.trim() ||
    `${user.name}'s workspace`;
  const organization = await OrganizationModel.create({
    name,
    slug: await uniqueSlug(name),
    workspaceType: input.workspaceType ?? 'solo',
    businessEmail: user.email,
    businessAddress: user.businessAddress,
    defaultCurrency: user.defaultCurrency,
    defaultHourlyRate: user.defaultHourlyRate,
    invoicePrefix: user.invoicePrefix || 'INV',
    defaultInvoiceNotes: user.defaultInvoiceNotes,
    timezone: 'UTC',
    weekStartsOn: 1,
    defaultWeeklyCapacity: 40,
  });
  const membership = await OrganizationMembershipModel.create({
    organizationId: organization._id,
    userId: user._id,
    role: 'owner',
    status: 'active',
    weeklyCapacity: 40,
    permissionOverrides: { allow: [], deny: [] },
    joinedAt: new Date(),
  });

  user.lastActiveOrganizationId = organization._id;
  await user.save();
  await migrateLegacyRecords(user, organization, membership);

  return { organization, membership };
}

export async function ensureUserWorkspace(
  user: UserDocument,
  requestedOrganizationId?: string,
) {
  const preferredId =
    requestedOrganizationId ?? user.lastActiveOrganizationId?.toString();
  let membership = preferredId
    ? await OrganizationMembershipModel.findOne({
        organizationId: preferredId,
        userId: user._id,
        status: 'active',
      })
    : null;

  membership ??= await OrganizationMembershipModel.findOne({
    userId: user._id,
    status: 'active',
  }).sort({ joinedAt: 1 });

  if (!membership) {
    return createOrganizationForUser(user);
  }

  const organization = await OrganizationModel.findOne({
    _id: membership.organizationId,
    status: 'active',
  });

  if (!organization) {
    throw new ApiError(403, 'This workspace is not available.');
  }

  if (
    user.lastActiveOrganizationId?.toString() !== organization._id.toString()
  ) {
    user.lastActiveOrganizationId = organization._id;
    await user.save();
  }

  await migrateLegacyRecords(user, organization, membership);
  return { organization, membership };
}

export function permissionsForMembership(
  membership: OrganizationMembershipDocument,
): Permission[] {
  return resolvePermissions(membership.role, membership.permissionOverrides);
}

export async function organizationSummaries(
  user: UserDocument,
): Promise<OrganizationSummary[]> {
  const memberships = await OrganizationMembershipModel.find({
    userId: user._id,
    status: 'active',
  });
  const organizations = await OrganizationModel.find({
    _id: { $in: memberships.map((membership) => membership.organizationId) },
    status: 'active',
  });
  const organizationById = new Map(
    organizations.map((organization) => [
      organization._id.toString(),
      organization,
    ]),
  );

  return memberships.flatMap((membership) => {
    const organization = organizationById.get(
      membership.organizationId.toString(),
    );
    return organization
      ? [
          {
            id: organization._id.toString(),
            name: organization.name,
            slug: organization.slug,
            workspaceType: organization.workspaceType,
            role: membership.role,
          },
        ]
      : [];
  });
}

export async function sessionWorkspace(
  user: UserDocument,
  organizationId?: string,
) {
  const { organization, membership } = await ensureUserWorkspace(
    user,
    organizationId,
  );
  const permissions = permissionsForMembership(membership);

  return {
    organization,
    membership,
    permissions,
    contract: {
      organization: toOrganizationContract(organization),
      membership: toMembershipContract(membership, permissions),
      organizations: await organizationSummaries(user),
    },
  };
}

export function requireOrganizationContext(context: {
  organization?: OrganizationDocument;
  membership?: OrganizationMembershipDocument;
  permissions?: Permission[];
}) {
  if (!context.organization || !context.membership || !context.permissions) {
    throw new ApiError(401, 'Select an active workspace to continue.');
  }
  return {
    organization: context.organization,
    membership: context.membership,
    permissions: context.permissions,
  };
}

export function hasPermission(
  permissions: Permission[] | undefined,
  permission: Permission,
) {
  return permissions?.includes(permission) ?? false;
}

export function requirePermission(
  permissions: Permission[] | undefined,
  permission: Permission,
) {
  if (!hasPermission(permissions, permission)) {
    throw new ApiError(
      403,
      'You do not have permission to perform this action.',
    );
  }
}

export function organizationQuery(
  organizationId: Types.ObjectId,
  legacyUserId?: Types.ObjectId,
) {
  return legacyUserId
    ? {
        $or: [
          { organizationId },
          { organizationId: { $exists: false }, userId: legacyUserId },
        ],
      }
    : { organizationId };
}

export const editableRoles: MembershipRole[] = [
  'admin',
  'project_manager',
  'finance',
  'member',
  'viewer',
];
