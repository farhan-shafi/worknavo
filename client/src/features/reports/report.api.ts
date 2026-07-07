import type {
  MessageResponse,
  WeeklyReportListResponse,
  WeeklyReportResponse,
} from '@clientflow/shared';

import { downloadFile, request } from '../../lib/api-client';
import { trackEvent } from '../../lib/analytics';
import type { ReportFilters, ReportFormValues } from './report.schemas';
import { parseHighlightsInput } from './report.utils';

function queryString(filters: ReportFilters) {
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

function reportInput(values: ReportFormValues) {
  return {
    ...values,
    summary: values.summary?.trim() || null,
    highlights: values.highlights
      ? parseHighlightsInput(values.highlights)
      : [],
  };
}

export const reportApi = {
  list: (filters: ReportFilters) =>
    request<WeeklyReportListResponse>(`/reports${queryString(filters)}`),
  get: (reportId: string) =>
    request<WeeklyReportResponse>(`/reports/${reportId}`),
  create: async (values: ReportFormValues) => {
    const response = await request<WeeklyReportResponse>('/reports', {
      method: 'POST',
      body: JSON.stringify(reportInput(values)),
    });
    trackEvent('report_created');
    return response;
  },
  update: (reportId: string, values: ReportFormValues) =>
    request<WeeklyReportResponse>(`/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(reportInput(values)),
    }),
  delete: (reportId: string) =>
    request<MessageResponse>(`/reports/${reportId}`, {
      method: 'DELETE',
    }),
  downloadPdf: async (reportId: string, fallbackFilename: string) => {
    await downloadFile(`/reports/${reportId}/pdf`, fallbackFilename);
    trackEvent('report_downloaded');
  },
  sendEmail: (reportId: string) =>
    request<MessageResponse>(`/reports/${reportId}/send-email`, {
      method: 'POST',
    }),
};
