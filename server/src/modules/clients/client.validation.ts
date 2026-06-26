import { z } from 'zod';

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

const websiteSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((value) => value || undefined)
  .refine(
    (value) =>
      !value ||
      z
        .string()
        .url()
        .safeParse(
          value.startsWith('http://') || value.startsWith('https://')
            ? value
            : `https://${value}`,
        ).success,
    'Enter a valid website address.',
  );

export const clientStatusSchema = z.enum(['active', 'inactive', 'archived']);

export const createClientSchema = z.object({
  name: z.string().trim().min(2, 'Client name is required.').max(100),
  companyName: optionalText(150),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40),
  website: websiteSchema,
  address: optionalText(500),
  status: clientStatusSchema.default('active'),
  notes: optionalText(3000),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.union([clientStatusSchema, z.literal('all')]).default('all'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
