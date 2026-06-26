import type { InvoiceStatus } from '@clientflow/shared';

import { StatusBadge } from '../../components/shared/StatusBadge';

const invoiceTone: Record<
  InvoiceStatus,
  'neutral' | 'primary' | 'success' | 'warning' | 'danger'
> = {
  draft: 'neutral',
  sent: 'primary',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'danger',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge tone={invoiceTone[status]}>{status}</StatusBadge>;
}
