import { createHash, randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { workspaceActor } from '../../auth/workspace-context.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { OrganizationInvitationModel } from '../../models/OrganizationInvitation.model.js';
import { OrganizationMembershipModel } from '../../models/OrganizationMembership.model.js';
import { OrganizationModel } from '../../models/Organization.model.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';
import { UserModel } from '../../models/User.model.js';
import { ApiError } from '../../utils/api-error.js';
import { recordAudit } from '../audit/audit.service.js';
import { sendWorkspaceInvitationEmail } from '../email/email.service.js';
import { env } from '../../config/env.js';

const tokenSchema = z.object({
  token: z.string().trim().min(20),
});
const registrationAcceptanceSchema = tokenSchema.extend({
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(128),
});

function invitationContract(
  invitation: InstanceType<typeof OrganizationInvitationModel>,
) {
  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    jobTitle: invitation.jobTitle ?? null,
    projectIds: invitation.projectIds.map(String),
    permissionOverrides: invitation.permissionOverrides,
    status: invitation.status,
    expiresAt: invitation.expiresAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

async function invitationFromToken(rawToken: string) {
  const invitation = await OrganizationInvitationModel.findOne({
    tokenHash: createHash('sha256').update(rawToken).digest('hex'),
    status: 'pending',
  }).select('+tokenHash');
  if (!invitation)
    throw new ApiError(404, 'Invitation not found or already used.');
  if (!invitation.expiresAt || invitation.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, 'This invitation has expired.');
  }
  return invitation;
}

async function acceptInvitation(
  invitation: InstanceType<typeof OrganizationInvitationModel>,
  user: InstanceType<typeof UserModel>,
) {
  if (user.email !== invitation.email) {
    throw new ApiError(403, 'Sign in with the email address that was invited.');
  }
  const existing = await OrganizationMembershipModel.exists({
    organizationId: invitation.organizationId,
    userId: user._id,
  });
  if (existing)
    throw new ApiError(409, 'You already belong to this workspace.');
  const organization = await OrganizationModel.findById(
    invitation.organizationId,
  );
  if (!organization || organization.status !== 'active') {
    throw new ApiError(404, 'Workspace not found.');
  }
  const membership = await OrganizationMembershipModel.create({
    organizationId: invitation.organizationId,
    userId: user._id,
    role: invitation.role,
    jobTitle: invitation.jobTitle,
    status: 'active',
    weeklyCapacity: organization.defaultWeeklyCapacity,
    permissionOverrides: invitation.permissionOverrides,
    invitedByUserId: invitation.invitedByUserId,
    joinedAt: new Date(),
  });
  if (invitation.projectIds.length) {
    await ProjectAssignmentModel.insertMany(
      invitation.projectIds.map((projectId) => ({
        organizationId: invitation.organizationId,
        projectId,
        membershipId: membership._id,
        assignmentType:
          invitation.role === 'project_manager'
            ? 'project_manager'
            : 'contributor',
        categoryIds: [],
        active: true,
      })),
    );
  }
  invitation.status = 'accepted';
  invitation.acceptedAt = new Date();
  invitation.tokenHash = undefined;
  await invitation.save();
  user.lastActiveOrganizationId = invitation.organizationId;
  await user.save();
  return { membership, organization };
}

export const invitationRouter = Router();

invitationRouter.post('/register-accept', async (request, response) => {
  const input = registrationAcceptanceSchema.parse(request.body);
  const invitation = await invitationFromToken(input.token);
  const existing = await UserModel.exists({ email: invitation.email });
  if (existing) {
    throw new ApiError(409, 'This account already exists. Sign in to accept.');
  }
  const user = await UserModel.create({
    name: input.name,
    email: invitation.email,
    passwordHash: await bcrypt.hash(input.password, 12),
  });
  const { organization } = await acceptInvitation(invitation, user);
  response.status(201).json({
    message: `Account created. You joined ${organization.name}. Sign in to continue.`,
  });
});

invitationRouter.use(requireAuth);

invitationRouter.get('/', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('members.invite')) {
    throw new ApiError(403, 'You cannot view workspace invitations.');
  }
  const invitations = await OrganizationInvitationModel.find({
    organizationId: actor.organization._id,
  }).sort({ createdAt: -1 });
  response.json({ invitations: invitations.map(invitationContract) });
});

invitationRouter.post('/accept', async (request, response) => {
  if (!request.user)
    throw new ApiError(401, 'Sign in to accept this invitation.');
  const { token } = tokenSchema.parse(request.body);
  const invitation = await invitationFromToken(token);
  const { organization } = await acceptInvitation(invitation, request.user);
  response.json({
    message: `You joined ${organization.name}.`,
    organizationId: organization._id.toString(),
  });
});

invitationRouter.post('/:id/resend', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('members.invite')) {
    throw new ApiError(403, 'You cannot resend invitations.');
  }
  const rawToken = randomBytes(32).toString('hex');
  const invitation = await OrganizationInvitationModel.findOneAndUpdate(
    {
      _id: request.params.id,
      organizationId: actor.organization._id,
      status: 'pending',
    },
    {
      $set: {
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    { new: true },
  );
  if (!invitation) throw new ApiError(404, 'Pending invitation not found.');
  await recordAudit(request, {
    action: 'invitation.resent',
    entityType: 'invitation',
    entityId: invitation._id.toString(),
  });
  const acceptUrl = `${env.CLIENT_URL}/accept-invitation?token=${rawToken}`;
  let delivered = false;
  try {
    await sendWorkspaceInvitationEmail({
      recipient: invitation.email,
      inviterName: actor.user.name,
      organizationName: actor.organization.name,
      acceptUrl,
    });
    delivered = true;
  } catch {
    delivered = false;
  }
  response.json({
    message: delivered
      ? 'Invitation renewed and sent.'
      : 'Invitation renewed. Copy the link manually because email is unavailable.',
    acceptUrl,
    delivered,
  });
});

invitationRouter.delete('/:id', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('members.invite')) {
    throw new ApiError(403, 'You cannot revoke invitations.');
  }
  const invitation = await OrganizationInvitationModel.findOneAndUpdate(
    {
      _id: request.params.id,
      organizationId: actor.organization._id,
      status: 'pending',
    },
    { $set: { status: 'revoked' }, $unset: { tokenHash: 1 } },
    { new: true },
  );
  if (!invitation) throw new ApiError(404, 'Pending invitation not found.');
  await recordAudit(request, {
    action: 'invitation.revoked',
    entityType: 'invitation',
    entityId: invitation._id.toString(),
  });
  response.json({ message: 'Invitation revoked.' });
});
