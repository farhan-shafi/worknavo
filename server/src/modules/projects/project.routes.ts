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
import { UserModel } from '../../models/User.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';
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
  plannedHoursPerWeek: z.coerce.number().min(0).max(168).optional(),
});

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

function activeAssignmentWindow(date = new Date()) {
  return {
    active: true,
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: date } },
    ],
    $and: [
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: date } },
        ],
      },
    ],
  };
}

projectRouter.use(requireAuth);
projectRouter.route('/').get(listProjects).post(createProject);
projectRouter.get('/:id/team', async (request, response) => {
  const actor = workspaceActor(request);
  if (
    !actor.permissions.includes('members.view') &&
    !actor.permissions.includes('members.viewProject')
  ) {
    throw new ApiError(403, 'You cannot view project team members.');
  }
  const project = await ProjectModel.findOne({
    _id: request.params.id,
    ...(await projectVisibilityQuery(actor)),
  }).select('_id');
  if (!project) throw new ApiError(404, 'Project not found.');

  const assignments = await ProjectAssignmentModel.find({
    organizationId: actor.organization._id,
    projectId: request.params.id,
    ...activeAssignmentWindow(),
  }).sort({ assignmentType: 1, createdAt: 1 });
  const membershipIds = assignments.map(
    (assignment) => assignment.membershipId,
  );
  const [memberships, hours] = await Promise.all([
    OrganizationMembershipModel.find({
      _id: { $in: membershipIds },
      organizationId: actor.organization._id,
    }),
    WorkLogModel.aggregate<{ _id: unknown; hours: number }>([
      {
        $match: {
          organizationId: actor.organization._id,
          projectId: project._id,
          membershipId: { $in: membershipIds },
          status: 'completed',
          workDate: { $gte: startOfWeek(new Date()) },
        },
      },
      { $group: { _id: '$membershipId', hours: { $sum: '$durationHours' } } },
    ]),
  ]);
  const plannedRows = await ProjectAssignmentModel.aggregate<{
    _id: unknown;
    plannedHours: number;
  }>([
    {
      $match: {
        organizationId: actor.organization._id,
        membershipId: { $in: membershipIds },
        ...activeAssignmentWindow(),
      },
    },
    {
      $group: {
        _id: '$membershipId',
        plannedHours: { $sum: { $ifNull: ['$plannedHoursPerWeek', 0] } },
      },
    },
  ]);
  const users = await UserModel.find({
    _id: { $in: memberships.map((membership) => membership.userId) },
  });
  const membershipById = new Map(
    memberships.map((membership) => [membership._id.toString(), membership]),
  );
  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const hoursByMembershipId = new Map(
    hours.map((row) => [String(row._id), row.hours]),
  );
  const plannedHoursByMembershipId = new Map(
    plannedRows.map((row) => [String(row._id), row.plannedHours]),
  );

  response.json({
    members: assignments.flatMap((assignment) => {
      const membership = membershipById.get(assignment.membershipId.toString());
      if (!membership) return [];
      const user = userById.get(membership.userId.toString());
      const projectHoursThisWeek =
        hoursByMembershipId.get(membership._id.toString()) ?? 0;
      const totalPlannedHoursThisWeek =
        plannedHoursByMembershipId.get(membership._id.toString()) ?? 0;
      return [
        {
          membershipId: membership._id.toString(),
          userId: membership.userId.toString(),
          name: user?.name ?? 'Former member',
          avatarUrl: user?.avatarUrl ?? null,
          jobTitle: membership.jobTitle ?? null,
          role: membership.role,
          assignmentType: assignment.assignmentType,
          categoryIds: assignment.categoryIds.map((categoryId) =>
            categoryId.toString(),
          ),
          plannedHoursPerWeek: assignment.plannedHoursPerWeek ?? null,
          weeklyCapacity: membership.weeklyCapacity,
          status: membership.status,
          projectHoursThisWeek,
          totalPlannedHoursThisWeek,
          projectPlanRemainingHours:
            assignment.plannedHoursPerWeek === undefined
              ? null
              : Math.max(
                  assignment.plannedHoursPerWeek - projectHoursThisWeek,
                  0,
                ),
          plannedAllocationPercent: membership.weeklyCapacity
            ? Number(
                (
                  (totalPlannedHoursThisWeek / membership.weeklyCapacity) *
                  100
                ).toFixed(1),
              )
            : 0,
        },
      ];
    }),
  });
});
projectRouter.get('/:id/assignments', async (request, response) => {
  const actor = workspaceActor(request);
  if (
    !actor.permissions.includes('projects.assign') &&
    !actor.permissions.includes('members.view') &&
    !actor.permissions.includes('members.viewProject')
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
    ...activeAssignmentWindow(),
  });
  response.json({
    assignments: assignments.map((assignment) => ({
      id: assignment._id.toString(),
      membershipId: assignment.membershipId.toString(),
      projectId: assignment.projectId.toString(),
      assignmentType: assignment.assignmentType,
      categoryIds: assignment.categoryIds.map(String),
      plannedHoursPerWeek: assignment.plannedHoursPerWeek ?? null,
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
  const assignmentSet: Record<string, unknown> = {
    assignmentType: assignmentInput.assignmentType,
    categoryIds: assignmentInput.categoryIds,
    active: true,
  };
  if (assignmentInput.plannedHoursPerWeek !== undefined) {
    assignmentSet.plannedHoursPerWeek = assignmentInput.plannedHoursPerWeek;
  }
  const assignment = await ProjectAssignmentModel.findOneAndUpdate(
    {
      organizationId: actor.organization._id,
      projectId: request.params.id,
      membershipId,
    },
    {
      $set: assignmentSet,
      ...(assignmentInput.plannedHoursPerWeek === undefined
        ? { $unset: { plannedHoursPerWeek: 1 } }
        : {}),
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
