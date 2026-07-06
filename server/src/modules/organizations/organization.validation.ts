import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  workspaceType: z.enum(['solo', 'company']).default('company'),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  workspaceType: z.enum(['solo', 'company']).optional(),
  businessEmail: z.string().trim().email().max(254).nullish(),
  businessAddress: z.string().trim().max(500).nullish(),
  website: z.string().trim().max(300).nullish(),
  defaultCurrency: z.enum(['USD', 'PKR', 'GBP', 'EUR']).optional(),
  defaultHourlyRate: z.coerce.number().min(0).max(1_000_000).nullish(),
  invoicePrefix: z.string().trim().min(1).max(12).optional(),
  defaultInvoiceNotes: z.string().trim().max(2000).nullish(),
  timezone: z.string().trim().min(1).max(100).optional(),
  weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
  defaultWeeklyCapacity: z.coerce.number().min(1).max(168).optional(),
  workLogRequireCategory: z.boolean().optional(),
  workLogRequireDescription: z.boolean().optional(),
  workLogMinimumDescriptionLength: z.coerce
    .number()
    .int()
    .min(0)
    .max(500)
    .optional(),
  workLogLockAfterDays: z.coerce.number().int().min(1).max(3650).nullish(),
  invoiceTimeRoundingMinutes: z.coerce
    .number()
    .int()
    .refine(
      (value) => [0, 5, 10, 15, 30].includes(value),
      'Select a supported invoice rounding rule.',
    )
    .optional(),
});
