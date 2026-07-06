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

const optionalString = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().trim().optional(),
);

const expenseFields = {
  clientId: z.string().trim().min(1, 'Select a client.'),
  projectId: optionalString,
  description: z
    .string()
    .trim()
    .min(2, 'Expense description is required.')
    .max(180),
  category: optionalText(80),
  expenseDate: z.coerce.date(),
  amount: z.coerce.number().gt(0).max(1_000_000_000),
  currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  billable: z.boolean().default(true),
  receiptUrl: optionalText(1000),
  notes: optionalText(2000),
};

export const createExpenseSchema = z.object(expenseFields);
export const updateExpenseSchema = z.object(expenseFields).partial();

export const listExpensesQuerySchema = z.object({
  clientId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  billable: z
    .union([z.literal('all'), z.literal('billable'), z.literal('non-billable')])
    .default('all'),
  invoice: z
    .union([z.literal('all'), z.literal('uninvoiced'), z.literal('invoiced')])
    .default('all'),
  startDate: optionalDate,
  endDate: optionalDate,
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
