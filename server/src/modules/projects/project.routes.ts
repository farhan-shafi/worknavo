import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  projectVisibilityQuery,
  workspaceActor,
} from '../../auth/workspace-context.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import { OrganizationMembershipModel } from '../../models/OrganizationMembership.model.js';
import { ApiError } from '../../utils/api-error.js';
import { recordAudit } from '../audit/audit.service.js';
import { NotificationModel } from '../../models/Notification.model.js';
import {
  createProject,
  deleteProject,
  listProjects,
  showProject,
  updateProject,
} from './project.controller.js';

export const projectRouter = Router();
const projectAssignmentInputSchema = z.object({
  membershipId: z.string().trim().min(1),
  assignmentType: z
    .enum(['project_manager', 'contributor'])
    .default('contributor'),
  categoryIds: z.array(z.string().trim().min(1)).default([]),
});

projectRouter.use(requireAuth);
projectRouter.route('/').get(listProjects).post(createProject);
projectRouter.get('/:id/assignments', async (request, response) => {
  const actor = workspaceActor(request);
  if (
    !actor.permissions.includes('projects.assign') &&
    !actor.permissions.includes('members.view')
  ) {
    throw new ApiError(403, 'You cannot view project assignments.');
  }
  const project = await ProjectModel.exists({
    _id: request.params.id,
    ...(await projectVisibilityQuery(actor)),
  });
  if (!project) throw new ApiError(404, 'Project not found.');
  const assignments = await ProjectAssignmentModel.find({
    organizationId: actor.organization._id,
    projectId: request.params.id,
    active: true,
  });
  response.json({
    assignments: assignments.map((assignment) => ({
      id: assignment._id.toString(),
      membershipId: assignment.membershipId.toString(),
      projectId: assignment.projectId.toString(),
      assignmentType: assignment.assignmentType,
      categoryIds: assignment.categoryIds.map(String),
      startDate: assignment.startDate?.toISOString() ?? null,
      endDate: assignment.endDate?.toISOString() ?? null,
      active: assignment.active,
    })),
  });
});
projectRouter.post('/:id/assignments', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('projects.assign')) {
    throw new ApiError(403, 'You cannot assign project members.');
  }
  const assignmentInput = projectAssignmentInputSchema.parse(request.body);
  const membershipId = assignmentInput.membershipId;
  const [project, membership] = await Promise.all([
    ProjectModel.exists({
      _id: request.params.id,
      ...(await projectVisibilityQuery(actor)),
    }),
    OrganizationMembershipModel.exists({
      _id: membershipId,
      organizationId: actor.organization._id,
      status: 'active',
    }),
  ]);
  if (!project) throw new ApiError(404, 'Project not found.');
  if (!membership) throw new ApiError(404, 'Member not found.');
  const assignment = await ProjectAssignmentModel.findOneAndUpdate(
    {
      organizationId: actor.organization._id,
      projectId: request.params.id,
      membershipId,
    },
    {
      $set: {
        assignmentType: assignmentInput.assignmentType,
        categoryIds: assignmentInput.categoryIds,
        active: true,
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
  await recordAudit(request, {
    action: 'project.member_assigned',
    entityType: 'project_assignment',
    entityId: assignment._id.toString(),
    summary: { membershipId, projectId: request.params.id },
  });
  await NotificationModel.create({
    organizationId: actor.organization._id,
    recipientMembershipId: membershipId,
    type: 'project_assignment',
    title: 'Project assigned',
    message: 'You were assigned to a project.',
    targetUrl: `/app/projects`,
  });
  response.status(201).json({ message: 'Member assigned to project.' });
});
projectRouter.delete(
  '/:id/assignments/:membershipId',
  async (request, response) => {
    const actor = workspaceActor(request);
    if (!actor.permissions.includes('projects.assign')) {
      throw new ApiError(403, 'You cannot remove project members.');
    }
    const assignment = await ProjectAssignmentModel.findOneAndUpdate(
      {
        organizationId: actor.organization._id,
        projectId: request.params.id,
        membershipId: request.params.membershipId,
      },
      { $set: { active: false } },
      { new: true },
    );
    if (!assignment) throw new ApiError(404, 'Assignment not found.');
    await recordAudit(request, {
      action: 'project.member_removed',
      entityType: 'project_assignment',
      entityId: assignment._id.toString(),
    });
    await NotificationModel.create({
      organizationId: actor.organization._id,
      recipientMembershipId: request.params.membershipId,
      type: 'project_removal',
      title: 'Project assignment removed',
      message: 'You were removed from a project assignment.',
      targetUrl: '/app/projects',
    });
    response.json({ message: 'Member removed from project.' });
  },
);
projectRouter
  .route('/:id')
  .get(showProject)
  .patch(updateProject)
  .delete(deleteProject);
