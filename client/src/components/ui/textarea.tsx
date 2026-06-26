import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'border-border bg-card text-foreground placeholder:text-muted/60 focus:border-primary focus:ring-primary/10 min-h-28 w-full resize-y rounded-xl border px-3.5 py-3 text-sm transition outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    ref={ref}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
