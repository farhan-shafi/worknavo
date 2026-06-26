import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .max(254)
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(72, 'Password cannot exceed 72 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  businessName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  workspaceType: z.enum(['solo', 'company']).default('solo'),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms to continue.' }),
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(72),
  rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: passwordSchema,
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().trim().min(1),
});

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

export const updateSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Your name must contain at least 2 characters.')
    .max(80),
  businessName: optionalText(120),
  businessAddress: optionalText(500),
  defaultCurrency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  defaultHourlyRate: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().min(0).max(1_000_000).optional(),
  ),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, 'Invoice prefix is required.')
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, 'Use only letters, numbers, and hyphens.')
    .transform((value) => value.toUpperCase()),
  defaultInvoiceNotes: optionalText(2000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
