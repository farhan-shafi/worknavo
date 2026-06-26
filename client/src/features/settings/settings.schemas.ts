import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  businessName: z.string().trim().max(120),
  businessAddress: z.string().trim().max(500),
  defaultCurrency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  defaultHourlyRate: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 1_000_000),
      'Enter a valid hourly rate.',
    ),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, 'Invoice prefix is required.')
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, 'Use only letters, numbers, and hyphens.'),
  defaultInvoiceNotes: z.string().trim().max(2000),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
