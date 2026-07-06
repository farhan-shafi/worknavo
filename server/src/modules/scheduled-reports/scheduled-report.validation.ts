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

const recipientsSchema = z
  .array(z.string().trim().email('Enter a valid recipient email.'))
  .min(1, 'Add at least one recipient.')
  .max(10, 'Scheduled reports can include up to 10 recipients.')
  .transform((recipients) => [
    ...new Set(recipients.map((recipient) => recipient.toLowerCase())),
  ]);

const scheduledReportFields = {
  name: z.string().trim().min(2, 'Enter a schedule name.').max(140),
  clientId: optionalText(80),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  recipients: recipientsSchema,
  subject: optionalText(180),
  active: z.boolean().default(true),
  nextRunAt: optionalDate,
};

export const createScheduledReportSchema = z.object(scheduledReportFields);

export const updateScheduledReportSchema = z
  .object(scheduledReportFields)
  .partial();

export type CreateScheduledReportInput = z.infer<
  typeof createScheduledReportSchema
>;
export type UpdateScheduledReportInput = z.infer<
  typeof updateScheduledReportSchema
>;
