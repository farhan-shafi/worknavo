import { useQuery } from '@tanstack/react-query';

import { workLogApi } from './work-log.api';
import type { WorkLogFilters } from './work-log.schemas';

export const workLogQueryKeys = {
  all: ['work-logs'] as const,
  list: (filters: WorkLogFilters) =>
    [...workLogQueryKeys.all, 'list', filters] as const,
  detail: (workLogId: string) =>
    [...workLogQueryKeys.all, 'detail', workLogId] as const,
};

export function useWorkLogs(filters: WorkLogFilters) {
  return useQuery({
    queryKey: workLogQueryKeys.list(filters),
    queryFn: () => workLogApi.list(filters),
  });
}
