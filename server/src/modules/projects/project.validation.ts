import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional(),
);

const optionalMoney = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().min(0).max(1_000_000_000).optional(),
);

export const projectStatusSchema = z.enum([
  'active',
  'paused',
  'completed',
  'archived',
]);

const projectFields = {
  clientId: z.string().trim().min(1, 'Select a client.'),
  name: z.string().trim().min(2, 'Project name is required.').max(120),
  description: optionalText(3000),
  status: projectStatusSchema.default('active'),
  hourlyRate: z.coerce.number().min(0).max(1_000_000),
  currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  startDate: optionalDate,
  endDate: optionalDate,
  estimatedBudget: optionalMoney,
  allowedCategoryIds: z.array(z.string().trim().min(1)).default([]),
};

const validDateRange = (
  value: { startDate?: Date; endDate?: Date },
  context: z.RefinementCtx,
) => {
  if (
    value.startDate &&
    value.endDate &&
    value.endDate.getTime() < value.startDate.getTime()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be on or after the start date.',
    });
  }
};

export const createProjectSchema = z
  .object(projectFields)
  .superRefine(validDateRange);

export const updateProjectSchema = z
  .object(projectFields)
  .partial()
  .superRefine(validDateRange);

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.union([projectStatusSchema, z.literal('all')]).default('all'),
  clientId: z.string().trim().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
