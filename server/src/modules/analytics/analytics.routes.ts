import { Router } from 'express';
import { z } from 'zod';

import {
  actorHas,
  workspaceActor,
  workLogVisibilityQuery,
} from '../../auth/workspace-context.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { OrganizationMembershipModel } from '../../models/OrganizationMembership.model.js';
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
  const query = {
    ...(await workLogVisibilityQuery(actor)),
    status: 'completed',
    ...dateFilter(filters.startDate, filters.endDate),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.membershipId ? { membershipId: filters.membershipId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };
  const [byMember, byProject, totals] = await Promise.all([
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
  ]);
  const membershipIds = byMember.map((row) => row._id);
  const memberships = await OrganizationMembershipModel.find({
    _id: { $in: membershipIds },
  });
  const users = await UserModel.find({
    _id: { $in: memberships.map((membership) => membership.userId) },
  });
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const membershipById = new Map(
    memberships.map((membership) => [String(membership._id), membership]),
  );
  const projects = await ProjectModel.find({
    _id: { $in: byProject.map((row) => row._id) },
  });
  const projectById = new Map(
    projects.map((project) => [String(project._id), project]),
  );
  const showMoney = actorHas(actor, 'financials.view');
  response.json({
    totals: {
      hours: totals[0]?.hours ?? 0,
      billableHours: totals[0]?.billableHours ?? 0,
      billableValue: showMoney ? (totals[0]?.billableValue ?? 0) : null,
    },
    members: byMember.map((row) => {
      const membership = membershipById.get(String(row._id));
      const user = membership
        ? userById.get(String(membership.userId))
        : undefined;
      return {
        membershipId: String(row._id),
        name: user?.name ?? 'Former member',
        role: membership?.role ?? null,
        hours: row.hours,
        billableHours: row.billableHours,
        billableValue: showMoney ? row.billableValue : null,
        capacity: membership?.weeklyCapacity ?? null,
      };
    }),
    projects: byProject.map((row) => ({
      projectId: String(row._id),
      name: projectById.get(String(row._id))?.name ?? 'Archived project',
      hours: row.hours,
      billableHours: row.billableHours,
      billableValue: showMoney ? row.billableValue : null,
    })),
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
