import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '../ui/card';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  footer?: ReactNode;
}

export function StatCard({ footer, icon: Icon, label, value }: StatCardProps) {
  return (
    <Card className="group p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted text-sm font-semibold">{label}</span>
        <span className="bg-primary-soft/35 text-primary grid size-9 place-items-center rounded-xl transition-transform group-hover:scale-105">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-6 text-3xl font-extrabold tracking-tight">{value}</p>
      <div className="text-muted mt-1 min-h-4 text-xs">
        {footer ?? 'Ready for your real data'}
      </div>
    </Card>
  );
}
