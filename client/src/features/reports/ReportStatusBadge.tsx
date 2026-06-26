import type { WeeklyReportStatus } from '@clientflow/shared';

import { Badge } from '../../components/ui/badge';

export function ReportStatusBadge({ status }: { status: WeeklyReportStatus }) {
  return (
    <Badge variant={status === 'final' ? 'success' : 'neutral'}>
      {status === 'final' ? 'Final' : 'Draft'}
    </Badge>
  );
}
