import type { ClientStatus } from '@clientflow/shared';

import { StatusBadge } from '../../components/shared/StatusBadge';

const statusTone = {
  active: 'success',
  inactive: 'warning',
  archived: 'neutral',
} as const;

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <StatusBadge tone={statusTone[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </StatusBadge>
  );
}
