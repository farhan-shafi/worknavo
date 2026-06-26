import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-border bg-card text-foreground rounded-[1.25rem] border shadow-[0_18px_55px_-35px_rgba(71,45,29,0.35)]',
        className,
      )}
      {...props}
    />
  );
}
