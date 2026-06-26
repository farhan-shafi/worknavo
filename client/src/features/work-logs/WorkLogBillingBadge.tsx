import { StatusBadge } from '../../components/shared/StatusBadge';

export function WorkLogBillingBadge({ billable }: { billable: boolean }) {
  return billable ? (
    <StatusBadge tone="success">Billable</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Non-billable</StatusBadge>
  );
}
