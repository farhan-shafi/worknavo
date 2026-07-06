import type {
  ExpenseListResponse,
  ExpenseResponse,
  MessageResponse,
} from '@clientflow/shared';

import { request } from '../../lib/api-client';
import type { ExpenseFilters, ExpenseFormValues } from './expense.schemas';

function queryString(filters: ExpenseFilters) {
  const params = new URLSearchParams();

  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.billable !== 'all') params.set('billable', filters.billable);
  if (filters.invoice !== 'all') params.set('invoice', filters.invoice);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const query = params.toString();
  return query ? `?${query}` : '';
}

function expenseInput(values: ExpenseFormValues) {
  return {
    ...values,
    amount: Number(values.amount),
    billable: values.billable === 'true',
    category: values.category?.trim() || null,
    projectId: values.projectId?.trim() || null,
    receiptUrl: values.receiptUrl?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

export const expenseApi = {
  list: (filters: ExpenseFilters) =>
    request<ExpenseListResponse>(`/expenses${queryString(filters)}`),
  create: (values: ExpenseFormValues) =>
    request<ExpenseResponse>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseInput(values)),
    }),
  update: (expenseId: string, values: ExpenseFormValues) =>
    request<ExpenseResponse>(`/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(expenseInput(values)),
    }),
  delete: (expenseId: string) =>
    request<MessageResponse>(`/expenses/${expenseId}`, {
      method: 'DELETE',
    }),
};
