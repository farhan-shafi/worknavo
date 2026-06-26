import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ElementRef } from 'react';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-[0_10px_24px_-10px_rgba(227,93,34,0.8)] hover:-translate-y-0.5 hover:bg-primary-hover',
        secondary:
          'border border-border bg-white text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-soft/20',
        outline:
          'border border-border bg-transparent text-foreground hover:border-primary/30 hover:bg-primary-soft/20',
        ghost: 'text-muted hover:bg-surface-strong hover:text-foreground',
        danger:
          'bg-danger text-white shadow-[0_10px_24px_-10px_rgba(220,38,38,0.65)] hover:-translate-y-0.5 hover:bg-red-700',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-13 px-7 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<ElementRef<'button'>, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        className={cn(buttonVariants({ className, size, variant }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
