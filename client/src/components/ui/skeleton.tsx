import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-surface-strong relative overflow-hidden rounded-xl after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.8s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent',
        className,
      )}
      {...props}
    />
  );
}
