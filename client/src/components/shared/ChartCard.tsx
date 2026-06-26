import type { ReactNode } from 'react';

import { Card } from '../ui/card';

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ChartCard({
  action,
  children,
  description,
  title,
}: ChartCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-border flex items-start justify-between gap-4 border-b px-6 py-5">
        <div>
          <h2 className="font-extrabold">{title}</h2>
          {description ? (
            <p className="text-muted mt-1 text-xs">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
