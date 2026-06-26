import { randomBytes, createHash } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { NotificationModel } from '../../models/Notification.model.js';
import { OrganizationInvitationModel } from '../../models/OrganizationInvitation.model.js';
import { OrganizationMembershipModel } from '../../models/OrganizationMembership.model.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';
import { UserModel } from '../../models/User.model.js';
import { ApiError } from '../../utils/api-error.js';
import { recordAudit } from '../audit/audit.service.js';
import { resolvePermissions } from '../../auth/permissions.js';
import {
  editableRoles,
  requireOrganizationContext,
  requirePermission,
} from '../organizations/organization.service.js';
import { projectVisibilityQuery } from '../../auth/workspace-context.js';
import { ProjectModel } from '../../models/Project.model.js';
import { sendWorkspaceInvitationEmail } from '../email/email.service.js';
import { env } from '../../config/env.js';
import {
  assignProjectsSchema,
  inviteMemberSchema,
  updateMemberSchema,
} from './member.validation.js';

export const memberRouter = Router();
memberRouter.use(requireAuth);

function temporaryPassword() {
  return `${randomBytes(6).toString('base64url')}Aa1`;
}

async function memberContract(
  membership: InstanceType<typeof OrganizationMembershipModel>,
) {
  const user = await UserModel.findById(membership.userId);
  const assignments = await ProjectAssignmentModel.find({
    organizationId: membership.organizationId,
    membershipId: membership._id,
    active: true,
  });
  return {
    id: membership._id.toString(),
    userId: membership.userId.toString(),
    name: user?.name ?? 'Unknown member',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
    role: membership.role,
    jobTitle: membership.jobTitle ?? null,
    status: membership.status,
    weeklyCapacity: membership.weeklyCapacity,
    reportingManagerId: membership.reportingManagerId?.toString() ?? null,
    permissionOverrides: membership.permissionOverrides,
    permissions: resolvePermissions(
      membership.role,
      membership.permissionOverrides,
    ),
    projectIds: assignments.map((assignment) =>
      assignment.projectId.toString(),
    ),
    assignments: assignments.map((assignment) => ({
      projectId: assignment.projectId.toString(),
      assignmentType: assignment.assignmentType,
      categoryIds: assignment.categoryIds.map((categoryId) =>
        categoryId.toString(),
      ),
    })),
    joinedAt: membership.joinedAt.toISOString(),
  };
}

memberRouter.get('/', async (request, response) => {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'members.view');
  const memberships = await OrganizationMembershipModel.find({
    organizationId: organization._id,
  }).sort({ status: 1, role: 1, joinedAt: 1 });
  response.json({
    members: await Promise.all(memberships.map(memberContract)),
  });
});

memberRouter.get('/:id', async (request, response) => {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'members.view');
  const membership = await OrganizationMembershipModel.findOne({
    _id: request.params.id,
    organizationId: organization._id,
  });
  if (!membership) throw new ApiError(404, 'Member not found.');
  response.json({ member: await memberContract(membership) });
});

memberRouter.patch('/:id', async (request, response) => {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'members.manage');
  const input = updateMemberSchema.parse(request.body);
  const membership = await OrganizationMembershipModel.findOne({
    _id: request.params.id,
    organizationId: organization._id,
  });
  if (!membership) throw new ApiError(404, 'Member not found.');
  if (membership.role === 'owner') {
    throw new ApiError(409, 'Transfer ownership before changing the owner.');
  }
  if (input.role && !editableRoles.includes(input.role)) {
    throw new ApiError(422, 'Select a valid role.');
  }
  membership.set(input);
  await membership.save();
  await recordAudit(request, {
    action: 'member.updated',
    entityType: 'membership',
    entityId: membership._id.toString(),
    summary: { role: membership.role, status: membership.status },
  });
  await NotificationModel.create({
    organizationId: organization._id,
    recipientMembershipId: membership._id,
    type: 'role_changed',
    title: 'Your workspace access changed',
    message: `Your role is now ${membership.role.replace('_', ' ')}.`,
    targetUrl: '/app/settings',
  });
  response.json({
    message: 'Member updated successfully.',
    member: await memberContract(membership),
  });
});

for (const [path, status] of [
  ['suspend', 'suspended'],
  ['reactivate', 'active'],
] as const) {
  memberRouter.post(`/:id/${path}`, async (request, response) => {
    const { organization, permissions } = requireOrganizationContext(request);
    requirePermission(permissions, 'members.manage');
    const membership = await OrganizationMembershipModel.findOne({
      _id: request.params.id,
      organizationId: organization._id,
    });
    if (!membership) throw new ApiError(404, 'Member not found.');
    if (membership.role === 'owner') {
      throw new ApiError(409, 'The workspace owner cannot be suspended.');
    }
    membership.status = status;
    await membership.save();
    await recordAudit(request, {
      action: `member.${path}`,
      entityType: 'membership',
      entityId: membership._id.toString(),
    });
    await NotificationModel.create({
      organizationId: organization._id,
      recipientMembershipId: membership._id,
      type: `member_${path}`,
      title:
        status === 'suspended'
          ? 'Workspace access suspended'
          : 'Workspace access restored',
      message:
        status === 'suspended'
          ? 'An administrator suspended your workspace access.'
          : 'An administrator restored your workspace access.',
      targetUrl: '/app/dashboard',
    });
    response.json({ message: `Member ${path}d successfully.` });
  });
}

memberRouter.post('/:id/projects', async (request, response) => {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'projects.assign');
  const input = assignProjectsSchema.parse(request.body);
  const membership = await OrganizationMembershipModel.findOne({
    _id: request.params.id,
    organizationId: organization._id,
  });
  if (!membership) throw new ApiError(404, 'Member not found.');
  const visibleProjects = await ProjectModel.countDocuments({
    ...(await projectVisibilityQuery({
      user: request.user!,
      organization,
      membership: request.membership!,
      permissions,
    })),
    _id: { $in: input.assignments.map((assignment) => assignment.projectId) },
  });
  if (visibleProjects !== input.assignments.length) {
    throw new ApiError(403, 'One or more projects are outside your access.');
  }
  await ProjectAssignmentModel.deleteMany({
    organizationId: organization._id,
    membershipId: membership._id,
  });
  if (input.assignments.length) {
    await ProjectAssignmentModel.insertMany(
      input.assignments.map((assignment) => ({
        organizationId: organization._id,
        membershipId: membership._id,
        projectId: assignment.projectId,
        assignmentType: assignment.assignmentType,
        categoryIds: assignment.categoryIds,
        active: true,
      })),
    );
  }
  await recordAudit(request, {
    action: 'member.projects_assigned',
    entityType: 'membership',
    entityId: membership._id.toString(),
    summary: { projectIds: input.assignments.map((item) => item.projectId) },
  });
  response.json({ message: 'Project assignments updated.' });
});

memberRouter.post('/:id/transfer-ownership', async (request, response) => {
  const { organization, membership: actorMembership } =
    requireOrganizationContext(request);
  if (actorMembership.role !== 'owner') {
    throw new ApiError(403, 'Only the current owner can transfer ownership.');
  }
  if (request.body?.confirmation !== organization.name) {
    throw new ApiError(
      422,
      'Enter the workspace name exactly to confirm ownership transfer.',
    );
  }
  const nextOwner = await OrganizationMembershipModel.findOne({
    _id: request.params.id,
    organizationId: organization._id,
    status: 'active',
  });
  if (!nextOwner) throw new ApiError(404, 'Active member not found.');
  if (nextOwner._id.toString() === actorMembership._id.toString()) {
    throw new ApiError(409, 'You already own this workspace.');
  }
  nextOwner.role = 'owner';
  actorMembership.role = 'admin';
  await nextOwner.save();
  await actorMembership.save();
  await recordAudit(request, {
    action: 'organization.ownership_transferred',
    entityType: 'organization',
    entityId: organization._id.toString(),
    summary: {
      previousOwnerMembershipId: actorMembership._id.toString(),
      nextOwnerMembershipId: nextOwner._id.toString(),
    },
  });
  response.json({ message: 'Workspace ownership transferred successfully.' });
});

memberRouter.post('/invite', async (request, response) => {
  const { organization, permissions } = requireOrganizationContext(request);
  requirePermission(permissions, 'members.invite');
  if (!request.user) throw new ApiError(401, 'Log in to continue.');
  const input = inviteMemberSchema.parse(request.body);
  let user = await UserModel.findOne({ email: input.email });

  if (
    user &&
    (await OrganizationMembershipModel.exists({
      organizationId: organization._id,
      userId: user._id,
    }))
  ) {
    throw new ApiError(409, 'This user already belongs to the workspace.');
  }

  if (input.mode === 'admin_created') {
    let password: string | undefined;
    if (!user) {
      password = temporaryPassword();
      user = await UserModel.create({
        name: input.name ?? input.email.split('@')[0],
        email: input.email,
        passwordHash: await bcrypt.hash(password, 12),
        forcePasswordChange: true,
      });
    }
    const membership = await OrganizationMembershipModel.create({
      organizationId: organization._id,
      userId: user._id,
      role: input.role,
      jobTitle: input.jobTitle,
      status: 'active',
      weeklyCapacity: organization.defaultWeeklyCapacity,
      permissionOverrides: input.permissionOverrides,
      invitedByUserId: request.user._id,
      joinedAt: new Date(),
    });
    if (input.projectIds.length) {
      await ProjectAssignmentModel.insertMany(
        input.projectIds.map((projectId) => ({
          organizationId: organization._id,
          membershipId: membership._id,
          projectId,
          assignmentType:
            input.role === 'project_manager'
              ? 'project_manager'
              : 'contributor',
          categoryIds: [],
          active: true,
        })),
      );
    }
    await recordAudit(request, {
      action: 'member.created',
      entityType: 'membership',
      entityId: membership._id.toString(),
    });
    response.status(201).json({
      message: 'Member account created.',
      ...(password ? { temporaryPassword: password } : {}),
      member: await memberContract(membership),
    });
    return;
  }

  const duplicateInvitation = await OrganizationInvitationModel.exists({
    organizationId: organization._id,
    email: input.email,
    status: 'pending',
  });
  if (duplicateInvitation) {
    throw new ApiError(
      409,
      'A pending invitation already exists for this email.',
    );
  }
  const rawToken = randomBytes(32).toString('hex');
  const invitation = await OrganizationInvitationModel.create({
    organizationId: organization._id,
    email: input.email,
    role: input.role,
    jobTitle: input.jobTitle,
    projectIds: input.projectIds,
    permissionOverrides: input.permissionOverrides,
    tokenHash: createHash('sha256').update(rawToken).digest('hex'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invitedByUserId: request.user._id,
    status: 'pending',
  });
  await recordAudit(request, {
    action: 'invitation.created',
    entityType: 'invitation',
    entityId: invitation._id.toString(),
    summary: { email: input.email, role: input.role },
  });
  const acceptUrl = `${env.CLIENT_URL}/accept-invitation?token=${rawToken}`;
  let delivered = false;
  try {
    await sendWorkspaceInvitationEmail({
      recipient: invitation.email,
      inviterName: request.user.name,
      organizationName: organization.name,
      acceptUrl,
    });
    delivered = true;
  } catch {
    delivered = false;
  }
  response.status(201).json({
    message: delivered
      ? 'Invitation sent.'
      : 'Invitation created. Email is not configured, so copy the link manually.',
    invitation: {
      id: invitation._id.toString(),
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt?.toISOString(),
      acceptUrl,
      delivered,
    },
  });
});
