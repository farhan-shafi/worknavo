import type { ReactNode } from 'react';

import { Badge, type BadgeProps } from '../ui/badge';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: NonNullable<BadgeProps['variant']>;
  dot?: boolean;
}

const dotColors: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  dark: 'bg-white/60',
};

export function StatusBadge({
  children,
  dot = true,
  tone = 'neutral',
}: StatusBadgeProps) {
  return (
    <Badge variant={tone}>
      {dot ? (
        <span className={`size-1.5 rounded-full ${dotColors[tone]}`} />
      ) : null}
      {children}
    </Badge>
  );
}
