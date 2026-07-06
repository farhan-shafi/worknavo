import type {
  AuthResponse,
  MessageResponse,
  SessionResponse,
} from '@clientflow/shared';

import { request } from '../../lib/api-client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  acceptTerms: true;
  workspaceType: 'solo' | 'company';
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SettingsPayload {
  name: string;
  businessName?: string;
  businessAddress?: string;
  defaultCurrency: 'USD' | 'PKR' | 'GBP' | 'EUR';
  defaultHourlyRate?: number;
  invoicePrefix: string;
  defaultInvoiceNotes?: string;
}

export const authApi = {
  me: () => request<SessionResponse>('/auth/me'),
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request<MessageResponse>('/auth/logout', {
      method: 'POST',
    }),
  forgotPassword: (email: string) =>
    request<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { code: string; email: string; password: string }) =>
    request<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSettings: (payload: SettingsPayload) =>
    request<AuthResponse>('/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  switchOrganization: (organizationId: string) =>
    request<SessionResponse>('/auth/switch-organization', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    }),
};
