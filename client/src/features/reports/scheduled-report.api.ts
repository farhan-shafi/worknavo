import type {
  MessageResponse,
  ScheduledReportListResponse,
  ScheduledReportResponse,
} from '@clientflow/shared';

import { request } from '../../lib/api-client';
import type { ScheduledReportFormValues } from './scheduled-report.schemas';

function recipientsInput(value: string) {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function scheduledReportInput(values: ScheduledReportFormValues) {
  return {
    name: values.name.trim(),
    clientId: values.clientId?.trim() || null,
    frequency: values.frequency,
    recipients: recipientsInput(values.recipients),
    subject: values.subject?.trim() || null,
    active: values.active === 'true',
    nextRunAt: values.nextRunAt
      ? new Date(values.nextRunAt).toISOString()
      : undefined,
  };
}

export const scheduledReportApi = {
  list: () => request<ScheduledReportListResponse>('/scheduled-reports'),
  create: (values: ScheduledReportFormValues) =>
    request<ScheduledReportResponse>('/scheduled-reports', {
      method: 'POST',
      body: JSON.stringify(scheduledReportInput(values)),
    }),
  update: (scheduledReportId: string, values: ScheduledReportFormValues) =>
    request<ScheduledReportResponse>(
      `/scheduled-reports/${scheduledReportId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(scheduledReportInput(values)),
      },
    ),
  delete: (scheduledReportId: string) =>
    request<MessageResponse>(`/scheduled-reports/${scheduledReportId}`, {
      method: 'DELETE',
    }),
};
