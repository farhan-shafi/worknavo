import type { ScheduledReportFrequency } from '@clientflow/shared';
import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

export const scheduledReportFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter a schedule name.').max(140),
  clientId: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  recipients: z.string().trim().min(3, 'Add at least one recipient email.'),
  subject: optionalText(180),
  active: z.enum(['true', 'false']),
  nextRunAt: z.string().optional(),
});

export interface ScheduledReportFormValues {
  name: string;
  clientId?: string;
  frequency: ScheduledReportFrequency;
  recipients: string;
  subject?: string;
  active: 'true' | 'false';
  nextRunAt?: string;
}
