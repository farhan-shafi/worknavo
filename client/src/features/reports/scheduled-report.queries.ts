import { useQuery } from '@tanstack/react-query';

import { scheduledReportApi } from './scheduled-report.api';

export const scheduledReportQueryKeys = {
  all: ['scheduled-reports'] as const,
};

export function useScheduledReports() {
  return useQuery({
    queryKey: scheduledReportQueryKeys.all,
    queryFn: scheduledReportApi.list,
  });
}
