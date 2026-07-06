import type {
  MessageResponse,
  ScreenshotProofListResponse,
  ScreenshotProofResponse,
  WorkLogLocationProof,
  WorkLogListResponse,
  WorkLogResponse,
} from '@clientflow/shared';

import { downloadFile, request } from '../../lib/api-client';
import type {
  WorkLogFilters,
  WorkLogFormValues,
  WorkLogTimerValues,
} from './work-log.schemas';
import { parseTagInput } from './work-log.utils';

export type TimerLocationProofInput = WorkLogLocationProof;

function queryString(filters: WorkLogFilters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.billable !== 'all') {
    params.set('billable', filters.billable);
  }
  if (filters.clientId) {
    params.set('clientId', filters.clientId);
  }
  if (filters.projectId) {
    params.set('projectId', filters.projectId);
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

function workLogInput(values: WorkLogFormValues) {
  return {
    ...values,
    description: values.description?.trim() || null,
    categoryId: values.categoryId?.trim() || null,
    tags: parseTagInput(values.tags),
    durationHours: Number(values.durationHours),
    billable: values.billable === 'true',
  };
}

function timerInput(
  values: WorkLogTimerValues & {
    locationProof?: TimerLocationProofInput;
  },
) {
  return {
    ...values,
    description: values.description?.trim() || null,
    categoryId: values.categoryId?.trim() || null,
    tags: parseTagInput(values.tags),
    billable: values.billable === 'true',
  };
}

export const workLogApi = {
  list: (filters: WorkLogFilters) =>
    request<WorkLogListResponse>(`/work-logs${queryString(filters)}`),
  get: (workLogId: string) =>
    request<WorkLogResponse>(`/work-logs/${workLogId}`),
  create: (values: WorkLogFormValues) =>
    request<WorkLogResponse>('/work-logs', {
      method: 'POST',
      body: JSON.stringify(workLogInput(values)),
    }),
  startTimer: (
    values: WorkLogTimerValues & { locationProof?: TimerLocationProofInput },
  ) =>
    request<WorkLogResponse>('/work-logs/timer/start', {
      method: 'POST',
      body: JSON.stringify(timerInput(values)),
    }),
  stopTimer: (values?: { locationProof?: TimerLocationProofInput }) =>
    request<WorkLogResponse>('/work-logs/timer/stop', {
      method: 'POST',
      body: JSON.stringify(values ?? {}),
    }),
  update: (workLogId: string, values: WorkLogFormValues) =>
    request<WorkLogResponse>(`/work-logs/${workLogId}`, {
      method: 'PATCH',
      body: JSON.stringify(workLogInput(values)),
    }),
  listScreenshotProofs: (workLogId: string) =>
    request<ScreenshotProofListResponse>(
      `/work-logs/${workLogId}/screenshot-proofs`,
    ),
  createScreenshotProof: (
    workLogId: string,
    values: { imageDataUrl: string; capturedAt: string },
  ) =>
    request<ScreenshotProofResponse>(
      `/work-logs/${workLogId}/screenshot-proofs`,
      {
        method: 'POST',
        body: JSON.stringify(values),
      },
    ),
  downloadScreenshotProof: (workLogId: string, proofId: string) =>
    downloadFile(
      `/work-logs/${workLogId}/screenshot-proofs/${proofId}/file`,
      `screenshot-proof-${proofId}.jpg`,
    ),
  deleteScreenshotProof: (workLogId: string, proofId: string) =>
    request<MessageResponse>(
      `/work-logs/${workLogId}/screenshot-proofs/${proofId}`,
      { method: 'DELETE' },
    ),
  delete: (workLogId: string) =>
    request<MessageResponse>(`/work-logs/${workLogId}`, {
      method: 'DELETE',
    }),
};
