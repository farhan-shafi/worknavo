import type { ProjectStatus } from '@clientflow/shared';

import { StatusBadge } from '../../components/shared/StatusBadge';

const statusConfig = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  completed: { label: 'Completed', tone: 'primary' },
  archived: { label: 'Archived', tone: 'neutral' },
} as const;

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = statusConfig[status];
  return <StatusBadge tone={config.tone}>{config.label}</StatusBadge>;
}
