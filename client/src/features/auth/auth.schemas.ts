import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().email('Enter a valid email address.'),
  businessName: z.string().trim().max(120).optional(),
  workspaceType: z.enum(['solo', 'company']),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72)
    .regex(/[a-z]/, 'Add a lowercase letter.')
    .regex(/[A-Z]/, 'Add an uppercase letter.')
    .regex(/[0-9]/, 'Add a number.'),
  acceptTerms: z
    .boolean()
    .refine((value) => value, 'Accept the terms to continue.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72)
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/[0-9]/, 'Add a number.');

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address.'),
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'Enter the 6-digit code from your email.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
