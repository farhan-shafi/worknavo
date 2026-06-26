import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-surface text-muted',
        primary: 'border-primary/15 bg-primary/8 text-primary',
        success: 'border-success/15 bg-success/8 text-success',
        warning: 'border-warning/20 bg-warning/10 text-warning-dark',
        danger: 'border-danger/15 bg-danger/8 text-danger',
        dark: 'border-white/10 bg-white/8 text-white/75',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ className, variant }))} {...props} />
  );
}
