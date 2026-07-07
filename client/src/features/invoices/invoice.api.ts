import type {
  InvoiceListResponse,
  InvoiceResponse,
  MessageResponse,
} from '@clientflow/shared';

import { downloadFile, request } from '../../lib/api-client';
import { trackEvent } from '../../lib/analytics';
import type {
  GenerateInvoiceValues,
  InvoiceFilters,
  InvoiceFormValues,
} from './invoice.schemas';

function queryString(filters: InvoiceFilters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.clientId) {
    params.set('clientId', filters.clientId);
  }
  if (filters.startDate) {
    params.set('startDate', filters.startDate);
  }
  if (filters.endDate) {
    params.set('endDate', filters.endDate);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function manualInvoiceInput(values: InvoiceFormValues) {
  return {
    ...values,
    items: values.items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      workLogId: item.workLogId || null,
      expenseId: item.expenseId || null,
    })),
    discount: values.discount ? Number(values.discount) : 0,
    taxRate: values.taxRate ? Number(values.taxRate) : 0,
    notes: values.notes?.trim() || null,
  };
}

function generatedInvoiceInput(values: GenerateInvoiceValues) {
  return {
    ...values,
    discount: values.discount ? Number(values.discount) : 0,
    taxRate: values.taxRate ? Number(values.taxRate) : 0,
    notes: values.notes?.trim() || null,
  };
}

export const invoiceApi = {
  list: (filters: InvoiceFilters) =>
    request<InvoiceListResponse>(`/invoices${queryString(filters)}`),
  get: (invoiceId: string) =>
    request<InvoiceResponse>(`/invoices/${invoiceId}`),
  create: async (values: InvoiceFormValues) => {
    const response = await request<InvoiceResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify(manualInvoiceInput(values)),
    });
    trackEvent('invoice_created', { source: 'manual' });
    return response;
  },
  generateFromWorkLogs: async (values: GenerateInvoiceValues) => {
    const response = await request<InvoiceResponse>(
      '/invoices/generate-from-worklogs',
      {
        method: 'POST',
        body: JSON.stringify(generatedInvoiceInput(values)),
      },
    );
    trackEvent('invoice_created', { source: 'worklogs' });
    return response;
  },
  update: (invoiceId: string, values: InvoiceFormValues) =>
    request<InvoiceResponse>(`/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(manualInvoiceInput(values)),
    }),
  markPaid: (invoiceId: string) =>
    request<InvoiceResponse>(`/invoices/${invoiceId}/mark-paid`, {
      method: 'POST',
    }),
  delete: (invoiceId: string) =>
    request<MessageResponse>(`/invoices/${invoiceId}`, {
      method: 'DELETE',
    }),
  downloadPdf: async (invoiceId: string, fallbackFilename: string) => {
    await downloadFile(`/invoices/${invoiceId}/pdf`, fallbackFilename);
    trackEvent('invoice_downloaded');
  },
  sendEmail: (invoiceId: string) =>
    request<MessageResponse>(`/invoices/${invoiceId}/send-email`, {
      method: 'POST',
    }),
};
