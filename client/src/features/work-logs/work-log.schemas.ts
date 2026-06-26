import type { WorkLogBillingFilter } from '@clientflow/shared';
import { z } from 'zod';

import { parseTagInput } from './work-log.utils';

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

const hoursString = z
  .string()
  .trim()
  .refine((value) => value.length > 0, 'Enter the hours worked.')
  .refine(
    (value) =>
      Number.isFinite(Number(value)) &&
      Number(value) > 0 &&
      Number(value) <= 24,
    'Enter a valid number of hours.',
  );

export const workLogFormSchema = z.object({
  clientId: z.string().min(1, 'Select a client.'),
  projectId: z.string().min(1, 'Select a project.'),
  title: z.string().trim().min(2, 'Enter a work summary.').max(140),
  description: optionalText(4000),
  categoryId: optionalText(80),
  tags: z
    .string()
    .trim()
    .refine(
      (value) => parseTagInput(value).length <= 8,
      'Use up to 8 tags separated by commas.',
    ),
  workDate: z.string().min(1, 'Select the work date.'),
  durationHours: hoursString,
  billable: z.enum(['true', 'false']),
});

export const workLogTimerSchema = z.object({
  clientId: z.string().min(1, 'Select a client.'),
  projectId: z.string().min(1, 'Select a project.'),
  title: z.string().trim().min(2, 'Enter a work summary.').max(140),
  description: optionalText(4000),
  categoryId: optionalText(80),
  tags: z
    .string()
    .trim()
    .refine(
      (value) => parseTagInput(value).length <= 8,
      'Use up to 8 tags separated by commas.',
    ),
  billable: z.enum(['true', 'false']),
});

export interface WorkLogFormValues {
  clientId: string;
  projectId: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string;
  workDate: string;
  durationHours: string;
  billable: 'true' | 'false';
}

export interface WorkLogTimerValues {
  clientId: string;
  projectId: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string;
  billable: 'true' | 'false';
}

export interface WorkLogFilters {
  search: string;
  billable: WorkLogBillingFilter;
  clientId: string;
  projectId: string;
  startDate: string;
  endDate: string;
}
