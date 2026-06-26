import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      className={cn(
        'border-border bg-card text-foreground focus:border-primary focus:ring-primary/10 h-11 w-full appearance-none rounded-xl border px-3.5 pr-10 text-sm transition outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
  </div>
));

Select.displayName = 'Select';
