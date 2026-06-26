import { Router } from 'express';
import { z } from 'zod';

import { workspaceActor } from '../../auth/workspace-context.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { WorkCategoryModel } from '../../models/WorkCategory.model.js';
import { ApiError } from '../../utils/api-error.js';
import { recordAudit } from '../audit/audit.service.js';
import { ProjectModel } from '../../models/Project.model.js';
import { ProjectAssignmentModel } from '../../models/ProjectAssignment.model.js';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i)
    .default('#E35D22'),
  defaultBillable: z.boolean().default(true),
  active: z.boolean().default(true),
});

const updateCategorySchema = categorySchema.partial();

function contract(category: InstanceType<typeof WorkCategoryModel>) {
  return {
    id: category._id.toString(),
    name: category.name,
    color: category.color,
    defaultBillable: category.defaultBillable,
    active: category.active,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export const categoryRouter = Router();
categoryRouter.use(requireAuth);

categoryRouter.get('/', async (request, response) => {
  const actor = workspaceActor(request);
  const projectId =
    typeof request.query.projectId === 'string'
      ? request.query.projectId
      : undefined;
  let visibleCategoryIds: string[] | null = null;
  if (projectId) {
    const [project, assignment] = await Promise.all([
      ProjectModel.findOne({
        _id: projectId,
        organizationId: actor.organization._id,
      }),
      ProjectAssignmentModel.findOne({
        organizationId: actor.organization._id,
        projectId,
        membershipId: actor.membership._id,
        active: true,
      }),
    ]);
    if (!project) throw new ApiError(404, 'Project not found.');
    const projectIds = project.allowedCategoryIds.map(String);
    const assignmentIds = assignment?.categoryIds.map(String) ?? [];
    if (projectIds.length && assignmentIds.length) {
      visibleCategoryIds = projectIds.filter((id) =>
        assignmentIds.includes(id),
      );
    } else if (projectIds.length) {
      visibleCategoryIds = projectIds;
    } else if (assignmentIds.length) {
      visibleCategoryIds = assignmentIds;
    }
  }
  const categories = await WorkCategoryModel.find({
    organizationId: actor.organization._id,
    ...(visibleCategoryIds ? { _id: { $in: visibleCategoryIds } } : {}),
  }).sort({ active: -1, name: 1 });
  response.json({ categories: categories.map(contract) });
});

categoryRouter.post('/', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('categories.manage')) {
    throw new ApiError(403, 'You cannot manage workspace categories.');
  }
  const input = categorySchema.parse(request.body);
  const duplicate = await WorkCategoryModel.exists({
    organizationId: actor.organization._id,
    name: new RegExp(
      `^${input.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i',
    ),
  });
  if (duplicate) throw new ApiError(409, 'This category already exists.');
  const category = await WorkCategoryModel.create({
    organizationId: actor.organization._id,
    ...input,
  });
  await recordAudit(request, {
    action: 'category.created',
    entityType: 'work_category',
    entityId: category._id.toString(),
    summary: { name: category.name },
  });
  response.status(201).json({ category: contract(category) });
});

categoryRouter.patch('/:id', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('categories.manage')) {
    throw new ApiError(403, 'You cannot manage workspace categories.');
  }
  const input = updateCategorySchema.parse(request.body);
  const category = await WorkCategoryModel.findOneAndUpdate(
    {
      _id: request.params.id,
      organizationId: actor.organization._id,
    },
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!category) throw new ApiError(404, 'Category not found.');
  await recordAudit(request, {
    action: 'category.updated',
    entityType: 'work_category',
    entityId: category._id.toString(),
    summary: input,
  });
  response.json({ category: contract(category) });
});

categoryRouter.delete('/:id', async (request, response) => {
  const actor = workspaceActor(request);
  if (!actor.permissions.includes('categories.manage')) {
    throw new ApiError(403, 'You cannot manage workspace categories.');
  }
  const category = await WorkCategoryModel.findOneAndUpdate(
    {
      _id: request.params.id,
      organizationId: actor.organization._id,
    },
    { $set: { active: false } },
    { new: true },
  );
  if (!category) throw new ApiError(404, 'Category not found.');
  await recordAudit(request, {
    action: 'category.archived',
    entityType: 'work_category',
    entityId: category._id.toString(),
  });
  response.json({
    message: 'Category archived.',
    category: contract(category),
  });
});
