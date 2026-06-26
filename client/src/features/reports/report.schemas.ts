import type { WeeklyReportStatus } from '@clientflow/shared';
import { z } from 'zod';

import { parseHighlightsInput } from './report.utils';

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

export const reportFormSchema = z
  .object({
    clientId: z.string().min(1, 'Select a client.'),
    title: z.string().trim().min(2, 'Enter the report title.').max(140),
    weekStart: z.string().min(1, 'Select the week start.'),
    weekEnd: z.string().min(1, 'Select the week end.'),
    summary: optionalText(6000),
    highlights: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .refine((value) => {
        if (!value) return true;

        return parseHighlightsInput(value).length <= 8;
      }, 'Use up to 8 highlights, one per line.'),
    status: z.enum(['draft', 'final']),
  })
  .superRefine((values, context) => {
    if (
      values.weekStart &&
      values.weekEnd &&
      values.weekEnd < values.weekStart
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekEnd'],
        message: 'Week end must be on or after the week start.',
      });
    }
  });

export interface ReportFormValues {
  clientId: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  summary?: string;
  highlights?: string;
  status: WeeklyReportStatus;
}

export interface ReportFilters {
  search: string;
  status: WeeklyReportStatus | 'all';
  clientId: string;
  startDate: string;
  endDate: string;
}
