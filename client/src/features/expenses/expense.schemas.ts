import type {
  Currency,
  ExpenseBillableFilter,
  ExpenseInvoiceFilter,
} from '@clientflow/shared';
import { z } from 'zod';

const moneyString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine(
      (value) =>
        Number.isFinite(Number(value)) &&
        Number(value) > 0 &&
        Number(value) <= 1_000_000_000,
      `Enter a valid ${label.toLowerCase()}.`,
    );

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

export const expenseFormSchema = z.object({
  clientId: z.string().min(1, 'Select a client.'),
  projectId: z.string().optional(),
  description: z
    .string()
    .trim()
    .min(2, 'Enter an expense description.')
    .max(180),
  category: optionalText(80),
  expenseDate: z.string().min(1, 'Select the expense date.'),
  amount: moneyString('Amount'),
  currency: z.enum(['USD', 'PKR', 'GBP', 'EUR']),
  billable: z.enum(['true', 'false']),
  receiptUrl: optionalText(1000),
  notes: optionalText(2000),
});

export interface ExpenseFormValues {
  clientId: string;
  projectId?: string;
  description: string;
  category?: string;
  expenseDate: string;
  amount: string;
  currency: Currency;
  billable: 'true' | 'false';
  receiptUrl?: string;
  notes?: string;
}

export interface ExpenseFilters {
  clientId: string;
  projectId: string;
  billable: ExpenseBillableFilter;
  invoice: ExpenseInvoiceFilter;
  startDate: string;
  endDate: string;
}
