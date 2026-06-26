import { useQuery } from '@tanstack/react-query';

import { reportApi } from './report.api';
import type { ReportFilters } from './report.schemas';

export const reportQueryKeys = {
  all: ['reports'] as const,
  list: (filters: ReportFilters) =>
    [...reportQueryKeys.all, 'list', filters] as const,
  detail: (reportId: string) =>
    [...reportQueryKeys.all, 'detail', reportId] as const,
  client: (clientId: string) =>
    [...reportQueryKeys.all, 'client', clientId] as const,
};

export function useWeeklyReports(filters: ReportFilters) {
  return useQuery({
    queryKey: reportQueryKeys.list(filters),
    queryFn: () => reportApi.list(filters),
  });
}

export function useWeeklyReport(reportId: string | undefined) {
  return useQuery({
    queryKey: reportQueryKeys.detail(reportId ?? ''),
    queryFn: () => reportApi.get(reportId ?? ''),
    enabled: Boolean(reportId),
  });
}
