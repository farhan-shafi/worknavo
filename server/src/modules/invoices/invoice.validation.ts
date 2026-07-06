import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalString = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().trim().optional(),
);

const optionalDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional(),
);

const invoiceItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, 'Item description is required.')
    .max(400),
  quantity: z.coerce.number().gt(0).max(10_000),
  rate: z.coerce.number().min(0).max(1_000_000),
  workLogId: optionalString,
  expenseId: optionalString,
});

const invoiceFields = {
  clientId: z.string().trim().min(1, 'Select a client.'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  items: z.array(invoiceItemSchema).min(1).max(50),
  discount: z.coerce.number().min(0).max(1_000_000_000).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: optionalText(4000),
  status: z
    .enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
    .default('draft'),
};

export const createInvoiceSchema = z
  .object(invoiceFields)
  .superRefine((values, context) => {
    if (values.dueDate.getTime() < values.issueDate.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Due date must be on or after the issue date.',
      });
    }
  });

export const updateInvoiceSchema = z
  .object(invoiceFields)
  .partial()
  .superRefine((values, context) => {
    if (
      values.issueDate &&
      values.dueDate &&
      values.dueDate.getTime() < values.issueDate.getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Due date must be on or after the issue date.',
      });
    }
  });

export const generateInvoiceFromWorkLogsSchema = z
  .object({
    clientId: z.string().trim().min(1, 'Select a client.'),
    workLogIds: z.array(z.string().trim().min(1)).max(50).default([]),
    expenseIds: z.array(z.string().trim().min(1)).max(50).default([]),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    discount: z.coerce.number().min(0).max(1_000_000_000).default(0),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    notes: optionalText(4000),
    status: z.enum(['draft', 'sent', 'paid', 'overdue']).default('draft'),
  })
  .superRefine((values, context) => {
    if (values.dueDate.getTime() < values.issueDate.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Due date must be on or after the issue date.',
      });
    }
    if (values.workLogIds.length === 0 && values.expenseIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workLogIds'],
        message: 'Select at least one work log or expense.',
      });
    }
  });

export const listInvoicesQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z
      .union([
        z.literal('all'),
        z.literal('draft'),
        z.literal('sent'),
        z.literal('paid'),
        z.literal('overdue'),
        z.literal('cancelled'),
      ])
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

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type GenerateInvoiceFromWorkLogsInput = z.infer<
  typeof generateInvoiceFromWorkLogsSchema
>;
