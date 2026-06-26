import type {
  ClientListResponse,
  ClientOverviewResponse,
  ClientResponse,
  ClientStatus,
  MessageResponse,
} from '@clientflow/shared';

import { request } from '../../lib/api-client';
import type { ClientFormValues } from './client.schemas';

export interface ClientFilters {
  search: string;
  status: ClientStatus | 'all';
}

function queryString(filters: ClientFilters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const clientApi = {
  list: (filters: ClientFilters) =>
    request<ClientListResponse>(`/clients${queryString(filters)}`),
  get: (clientId: string) => request<ClientResponse>(`/clients/${clientId}`),
  overview: (clientId: string) =>
    request<ClientOverviewResponse>(`/clients/${clientId}/overview`),
  create: (input: ClientFormValues) =>
    request<ClientResponse>('/clients', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (clientId: string, input: ClientFormValues) =>
    request<ClientResponse>(`/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  delete: (clientId: string) =>
    request<MessageResponse>(`/clients/${clientId}`, {
      method: 'DELETE',
    }),
};
