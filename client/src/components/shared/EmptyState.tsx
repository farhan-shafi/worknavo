import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  action,
  compact = false,
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center px-5 py-10 text-center'
          : 'flex flex-col items-center px-6 py-16 text-center'
      }
    >
      <span className="bg-surface-strong text-primary grid size-12 place-items-center rounded-2xl">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-extrabold">{title}</h3>
      <p className="text-muted mt-2 max-w-sm text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
