import type { Currency, ProjectStatus } from '@clientflow/shared';
import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

const moneyString = (label: string, maximum: number, optional = false) =>
  z
    .string()
    .trim()
    .refine((value) => optional || value.length > 0, `${label} is required.`)
    .refine(
      (value) =>
        value.length === 0 ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= maximum),
      `Enter a valid ${label.toLowerCase()}.`,
    );

export const projectFormSchema = z
  .object({
    clientId: z.string().min(1, 'Select a client.'),
    name: z.string().trim().min(2, 'Enter the project name.').max(120),
    description: optionalText(3000),
    status: z.enum(['active', 'paused', 'completed', 'archived']),
    hourlyRate: moneyString('Hourly rate', 1_000_000),
    currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
    startDate: z.string(),
    endDate: z.string(),
    estimatedBudget: moneyString('Estimated budget', 1_000_000_000, true),
    allowedCategoryIds: z.array(z.string()),
  })
  .superRefine((values, context) => {
    if (
      values.startDate &&
      values.endDate &&
      values.endDate < values.startDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after the start date.',
      });
    }
  });

export interface ProjectFormValues {
  clientId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  hourlyRate: string;
  currency: Currency;
  startDate: string;
  endDate: string;
  estimatedBudget: string;
  allowedCategoryIds: string[];
}
