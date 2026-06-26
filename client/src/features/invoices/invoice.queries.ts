import { useQuery } from '@tanstack/react-query';

import { invoiceApi } from './invoice.api';
import type { InvoiceFilters } from './invoice.schemas';

export const invoiceQueryKeys = {
  all: ['invoices'] as const,
  list: (filters: InvoiceFilters) =>
    [...invoiceQueryKeys.all, 'list', filters] as const,
  detail: (invoiceId: string) =>
    [...invoiceQueryKeys.all, 'detail', invoiceId] as const,
};

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceQueryKeys.list(filters),
    queryFn: () => invoiceApi.list(filters),
  });
}

export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceQueryKeys.detail(invoiceId ?? ''),
    queryFn: () => invoiceApi.get(invoiceId ?? ''),
    enabled: Boolean(invoiceId),
  });
}
