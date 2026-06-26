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

const highlightsSchema = z.array(z.string().trim().min(1).max(120)).max(8);

const weeklyReportFields = {
  clientId: z.string().trim().min(1, 'Select a client.'),
  title: z.string().trim().min(2, 'Enter a report title.').max(140),
  weekStart: z.coerce.date(),
  weekEnd: z.coerce.date(),
  summary: optionalText(6000),
  highlights: highlightsSchema.default([]),
  status: z.enum(['draft', 'final']).default('draft'),
};

export const createWeeklyReportSchema = z
  .object(weeklyReportFields)
  .superRefine((values, context) => {
    if (values.weekEnd.getTime() < values.weekStart.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekEnd'],
        message: 'Week end must be on or after the week start.',
      });
    }
  });

export const updateWeeklyReportSchema = z
  .object(weeklyReportFields)
  .partial()
  .superRefine((values, context) => {
    if (
      values.weekStart &&
      values.weekEnd &&
      values.weekEnd.getTime() < values.weekStart.getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekEnd'],
        message: 'Week end must be on or after the week start.',
      });
    }
  });

export const listWeeklyReportsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z
      .union([z.literal('all'), z.literal('draft'), z.literal('final')])
      .default('all'),
    clientId: z.string().trim().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .superRefine((value, context) => {
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
  });

export type CreateWeeklyReportInput = z.infer<typeof createWeeklyReportSchema>;
export type UpdateWeeklyReportInput = z.infer<typeof updateWeeklyReportSchema>;
