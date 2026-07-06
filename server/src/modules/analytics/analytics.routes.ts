import { Router } from 'express';
import { z } from 'zod';

import {
  actorHas,
  projectVisibilityQuery,
  workspaceActor,
  workLogVisibilityQuery,
} from '../../auth/workspace-context.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { OrganizationMembershipModel } from '../../models/OrganizationMembership.model.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';
import { ProjectModel } from '../../models/Project.model.js';
import { UserModel } from '../../models/User.model.js';
import { WorkLogModel } from '../../models/WorkLog.model.js';
import { ApiError } from '../../utils/api-error.js';

const analyticsFilters = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  projectId: z.string().optional(),
  membershipId: z.string().optional(),
  categoryId: z.string().optional(),
});

function dateFilter(startDate?: Date, endDate?: Date) {
  return startDate || endDate
    ? {
        workDate: {
          ...(startDate ? { $gte: startDate } : {}),
          ...(endDate ? { $lte: endDate } : {}),
        },
      }
    : {};
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
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

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get('/me', async (request, response) => {
  const actor = workspaceActor(request);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [today, week, month, recent] = await Promise.all([
    WorkLogModel.aggregate<{ _id: null; hours: number; billable: number }>([
      {
        $match: {
          organizationId: actor.organization._id,
          membershipId: actor.membership._id,
          status: 'completed',
          workDate: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      },
      {
        $group: {
          _id: null,
          hours: { $sum: '$durationHours' },
          billable: {
            $sum: { $cond: ['$billable', '$durationHours', 0] },
          },
        },
      },
    ]),
    WorkLogModel.aggregate<{ _id: null; hours: number; billable: number }>([
      {
        $match: {
          organizationId: actor.organization._id,
          membershipId: actor.membership._id,
          status: 'completed',
          workDate: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: null,
          hours: { $sum: '$durationHours' },
          billable: {
            $sum: { $cond: ['$billable', '$durationHours', 0] },
          },
        },
      },
    ]),
    WorkLogModel.aggregate<{ _id: null; hours: number; billable: number }>([
      {
        $match: {
          organizationId: actor.organization._id,
          membershipId: actor.membership._id,
          status: 'completed',
          workDate: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: null,
          hours: { $sum: '$durationHours' },
          billable: {
            $sum: { $cond: ['$billable', '$durationHours', 0] },
          },
        },
      },
    ]),
    WorkLogModel.find({
      organizationId: actor.organization._id,
      membershipId: actor.membership._id,
      status: 'completed',
    })
      .sort({ workDate: -1 })
      .limit(8)
      .select('title projectId durationHours billable workDate'),
  ]);
  const weeklyHours = week[0]?.hours ?? 0;
  response.json({
    today: today[0] ?? { hours: 0, billable: 0 },
    week: week[0] ?? { hours: 0, billable: 0 },
    month: month[0] ?? { hours: 0, billable: 0 },
    weeklyCapacity: actor.membership.weeklyCapacity,
    utilization: actor.membership.weeklyCapacity
      ? Number(
          ((weeklyHours / actor.membership.weeklyCapacity) * 100).toFixed(1),
        )
      : 0,
    recent,
  });
});

analyticsRouter.get('/team', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actorHas(actor, 'analytics.viewTeam')) {
    throw new ApiError(403, 'You cannot view team analytics.');
  }
  const filters = analyticsFilters.parse(request.query);
  const visibleProjects = await ProjectModel.find(
    await projectVisibilityQuery(actor),
  ).select('_id name');
  const visibleProjectIds = visibleProjects.map((project) => project._id);
  const query = {
    ...(await workLogVisibilityQuery(actor)),
    status: 'completed',
    ...dateFilter(filters.startDate, filters.endDate),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.membershipId ? { membershipId: filters.membershipId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };
  const assignmentMatch = {
    organizationId: actor.organization._id,
    projectId: { $in: visibleProjectIds },
    ...activeAssignmentWindow(),
  };
  const [byMember, byProject, totals, plannedByMember, plannedByProject] =
    await Promise.all([
      WorkLogModel.aggregate<{
        _id: unknown;
        hours: number;
        billableHours: number;
        billableValue: number;
      }>([
        { $match: query },
        {
          $group: {
            _id: '$membershipId',
            hours: { $sum: '$durationHours' },
            billableHours: {
              $sum: { $cond: ['$billable', '$durationHours', 0] },
            },
            billableValue: {
              $sum: {
                $cond: [
                  '$billable',
                  { $multiply: ['$durationHours', '$hourlyRate'] },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { hours: -1 } },
      ]),
      WorkLogModel.aggregate<{
        _id: unknown;
        hours: number;
        billableHours: number;
        billableValue: number;
      }>([
        { $match: query },
        {
          $group: {
            _id: '$projectId',
            hours: { $sum: '$durationHours' },
            billableHours: {
              $sum: { $cond: ['$billable', '$durationHours', 0] },
            },
            billableValue: {
              $sum: {
                $cond: [
                  '$billable',
                  { $multiply: ['$durationHours', '$hourlyRate'] },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { hours: -1 } },
      ]),
      WorkLogModel.aggregate<{
        _id: null;
        hours: number;
        billableHours: number;
        billableValue: number;
      }>([
        { $match: query },
        {
          $group: {
            _id: null,
            hours: { $sum: '$durationHours' },
            billableHours: {
              $sum: { $cond: ['$billable', '$durationHours', 0] },
            },
            billableValue: {
              $sum: {
                $cond: [
                  '$billable',
                  { $multiply: ['$durationHours', '$hourlyRate'] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      ProjectAssignmentModel.aggregate<{
        _id: unknown;
        plannedHours: number;
      }>([
        { $match: assignmentMatch },
        {
          $group: {
            _id: '$membershipId',
            plannedHours: { $sum: { $ifNull: ['$plannedHoursPerWeek', 0] } },
          },
        },
        { $sort: { plannedHours: -1 } },
      ]),
      ProjectAssignmentModel.aggregate<{
        _id: unknown;
        plannedHours: number;
      }>([
        { $match: assignmentMatch },
        {
          $group: {
            _id: '$projectId',
            plannedHours: { $sum: { $ifNull: ['$plannedHoursPerWeek', 0] } },
          },
        },
        { $sort: { plannedHours: -1 } },
      ]),
    ]);
  const membershipIds = [
    ...new Set([
      ...byMember.map((row) => String(row._id)),
      ...plannedByMember.map((row) => String(row._id)),
    ]),
  ];
  const memberships = await OrganizationMembershipModel.find({
    _id: { $in: membershipIds },
    organizationId: actor.organization._id,
  });
  const users = await UserModel.find({
    _id: { $in: memberships.map((membership) => membership.userId) },
  });
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const membershipById = new Map(
    memberships.map((membership) => [String(membership._id), membership]),
  );
  const projectById = new Map(
    visibleProjects.map((project) => [String(project._id), project]),
  );
  const showMoney = actorHas(actor, 'financials.view');
  const loggedHoursByMember = new Map(
    byMember.map((row) => [String(row._id), row]),
  );
  const plannedHoursByMember = new Map(
    plannedByMember.map((row) => [String(row._id), row.plannedHours]),
  );
  const loggedHoursByProject = new Map(
    byProject.map((row) => [String(row._id), row]),
  );
  const plannedHoursByProject = new Map(
    plannedByProject.map((row) => [String(row._id), row.plannedHours]),
  );
  const projectIds = [
    ...new Set([
      ...byProject.map((row) => String(row._id)),
      ...plannedByProject.map((row) => String(row._id)),
    ]),
  ];
  const totalCapacity = memberships.reduce(
    (sum, membership) =>
      sum + (membership.status === 'active' ? membership.weeklyCapacity : 0),
    0,
  );
  const totalPlannedHours = plannedByMember.reduce(
    (sum, row) => sum + row.plannedHours,
    0,
  );
  const totalLoggedHours = totals[0]?.hours ?? 0;
  response.json({
    totals: {
      hours: totalLoggedHours,
      billableHours: totals[0]?.billableHours ?? 0,
      billableValue: showMoney ? (totals[0]?.billableValue ?? 0) : null,
      capacityHours: totalCapacity,
      plannedHours: totalPlannedHours,
      remainingCapacityHours: Math.max(totalCapacity - totalPlannedHours, 0),
      plannedUtilization:
        totalCapacity > 0
          ? Number(((totalPlannedHours / totalCapacity) * 100).toFixed(1))
          : 0,
      loggedUtilization:
        totalCapacity > 0
          ? Number(((totalLoggedHours / totalCapacity) * 100).toFixed(1))
          : 0,
    },
    members: membershipIds.map((membershipId) => {
      const row = loggedHoursByMember.get(membershipId);
      const membership = membershipById.get(membershipId);
      const user = membership
        ? userById.get(String(membership.userId))
        : undefined;
      const capacity = membership?.weeklyCapacity ?? null;
      const plannedHours = plannedHoursByMember.get(membershipId) ?? 0;
      const loggedHours = row?.hours ?? 0;
      return {
        membershipId,
        name: user?.name ?? 'Former member',
        role: membership?.role ?? null,
        hours: loggedHours,
        billableHours: row?.billableHours ?? 0,
        billableValue: showMoney ? (row?.billableValue ?? 0) : null,
        capacity,
        plannedHours,
        remainingCapacity:
          capacity === null ? null : Math.max(capacity - plannedHours, 0),
        plannedUtilization:
          capacity && capacity > 0
            ? Number(((plannedHours / capacity) * 100).toFixed(1))
            : 0,
        loggedUtilization:
          capacity && capacity > 0
            ? Number(((loggedHours / capacity) * 100).toFixed(1))
            : 0,
      };
    }),
    projects: projectIds.map((projectId) => {
      const row = loggedHoursByProject.get(projectId);
      return {
        projectId,
        name: projectById.get(projectId)?.name ?? 'Archived project',
        hours: row?.hours ?? 0,
        billableHours: row?.billableHours ?? 0,
        billableValue: showMoney ? (row?.billableValue ?? 0) : null,
        plannedHours: plannedHoursByProject.get(projectId) ?? 0,
      };
    }),
  });
});

analyticsRouter.get('/projects/:id', async (request, response) => {
  request.query = { ...request.query, projectId: request.params.id };
  const actor = workspaceActor(request);
  if (!actorHas(actor, 'analytics.viewTeam')) {
    throw new ApiError(403, 'You cannot view project analytics.');
  }
  const query = {
    ...(await workLogVisibilityQuery(actor)),
    projectId: request.params.id,
    status: 'completed',
  };
  const summary = await WorkLogModel.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$category',
        hours: { $sum: '$durationHours' },
        billableHours: {
          $sum: { $cond: ['$billable', '$durationHours', 0] },
        },
      },
    },
  ]);
  response.json({ projectId: request.params.id, categories: summary });
});

analyticsRouter.get('/export.csv', async (request, response) => {
  const actor = workspaceActor(request);
  const filters = analyticsFilters.parse(request.query);
  const logs = await WorkLogModel.find({
    ...(await workLogVisibilityQuery(actor)),
    status: 'completed',
    ...dateFilter(filters.startDate, filters.endDate),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.membershipId ? { membershipId: filters.membershipId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  }).sort({ workDate: -1 });
  const showMoney = actorHas(actor, 'financials.view');
  const header = [
    'Date',
    'Member ID',
    'Project ID',
    'Category',
    'Title',
    'Hours',
    'Billable',
    ...(showMoney ? ['Rate', 'Amount', 'Currency'] : []),
  ];
  const rows = logs.map((log) => [
    log.workDate.toISOString().slice(0, 10),
    log.membershipId,
    log.projectId,
    log.category ?? '',
    log.title,
    log.durationHours,
    log.billable ? 'Yes' : 'No',
    ...(showMoney
      ? [
          log.hourlyRate,
          log.billable
            ? Number((log.durationHours * log.hourlyRate).toFixed(2))
            : 0,
          log.currency,
        ]
      : []),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
  response
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="team-time-export.csv"',
    })
    .send(csv);
});
