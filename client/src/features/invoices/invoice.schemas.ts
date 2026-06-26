import type { Currency, InvoiceStatus } from '@clientflow/shared';
import { z } from 'zod';

const moneyString = (label: string, maximum: number, optional = false) =>
  z
    .string()
    .trim()
    .refine((value) => optional || value.length > 0, `${label} is required.`)
    .refine(
      (value) =>
        value.length === 0 ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= maximum),
      `Enter a valid ${label.toLowerCase()}.`,
    );

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

export const invoiceItemFormSchema = z.object({
  description: z.string().trim().min(2, 'Enter an item description.').max(400),
  quantity: moneyString('Hours', 10_000),
  rate: moneyString('Rate', 1_000_000),
  workLogId: z.string().trim().optional(),
});

export const invoiceFormSchema = z
  .object({
    clientId: z.string().min(1, 'Select a client.'),
    issueDate: z.string().min(1, 'Select the issue date.'),
    dueDate: z.string().min(1, 'Select the due date.'),
    currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
    items: z
      .array(invoiceItemFormSchema)
      .min(1, 'Add at least one invoice item.'),
    discount: moneyString('Discount', 1_000_000_000, true),
    taxRate: moneyString('Tax rate', 100, true),
    notes: optionalText(4000),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  })
  .superRefine((values, context) => {
    if (values.dueDate < values.issueDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Due date must be on or after the issue date.',
      });
    }
  });

export const generateInvoiceSchema = z
  .object({
    clientId: z.string().min(1, 'Select a client.'),
    issueDate: z.string().min(1, 'Select the issue date.'),
    dueDate: z.string().min(1, 'Select the due date.'),
    workLogIds: z
      .array(z.string().min(1))
      .min(1, 'Select at least one work log.'),
    discount: moneyString('Discount', 1_000_000_000, true),
    taxRate: moneyString('Tax rate', 100, true),
    notes: optionalText(4000),
    status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  })
  .superRefine((values, context) => {
    if (values.dueDate < values.issueDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Due date must be on or after the issue date.',
      });
    }
  });

export interface InvoiceItemFormValues {
  description: string;
  quantity: string;
  rate: string;
  workLogId?: string;
}

export interface InvoiceFormValues {
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  items: InvoiceItemFormValues[];
  discount: string;
  taxRate: string;
  notes?: string;
  status: InvoiceStatus;
}

export interface GenerateInvoiceValues {
  clientId: string;
  issueDate: string;
  dueDate: string;
  workLogIds: string[];
  discount: string;
  taxRate: string;
  notes?: string;
  status: Exclude<InvoiceStatus, 'cancelled'>;
}

export interface InvoiceFilters {
  search: string;
  status: InvoiceStatus | 'all';
  clientId: string;
  startDate: string;
  endDate: string;
}
