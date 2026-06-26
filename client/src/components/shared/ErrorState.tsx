import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '../ui/button';

export function ErrorState({
  description = 'Something interrupted this request. Check your connection and try again.',
  onRetry,
  title = 'This content could not be loaded',
}: {
  description?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div
      className="flex flex-col items-center px-6 py-14 text-center"
      role="alert"
    >
      <span className="bg-danger/10 text-danger grid size-12 place-items-center rounded-2xl">
        <AlertTriangle className="size-5" />
      </span>
      <h3 className="mt-4 font-extrabold">{title}</h3>
      <p className="text-muted mt-2 max-w-sm text-sm leading-6">
        {description}
      </p>
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry} variant="secondary">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
