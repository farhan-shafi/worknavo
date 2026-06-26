import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock3, Download, ReceiptText } from 'lucide-react';

import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Button } from '../../components/ui/button';
import { downloadFile, request } from '../../lib/api-client';
import { useAuth } from '../auth/use-auth';

interface TeamAnalytics {
  totals: {
    hours: number;
    billableHours: number;
    billableValue: number | null;
  };
  members: Array<{
    membershipId: string;
    name: string;
    role: string | null;
    hours: number;
    billableHours: number;
    billableValue: number | null;
    capacity: number | null;
  }>;
  projects: Array<{
    projectId: string;
    name: string;
    hours: number;
    billableHours: number;
    billableValue: number | null;
  }>;
}

export function AnalyticsPage() {
  const auth = useAuth();
  const analytics = useQuery({
    queryKey: ['analytics', 'team', auth.organization?.id],
    queryFn: () => request<TeamAnalytics>('/analytics/team'),
  });
  const data = analytics.data;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() =>
              downloadFile('/analytics/export.csv', 'team-time-export.csv')
            }
            variant="outline"
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        }
        description="Role-scoped time, utilization, and billing visibility for this workspace."
        eyebrow={auth.organization?.name}
        title="Analytics"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Clock3}
          label="Tracked hours"
          value={(data?.totals.hours ?? 0).toFixed(2)}
        />
        <StatCard
          icon={BarChart3}
          label="Billable hours"
          value={(data?.totals.billableHours ?? 0).toFixed(2)}
        />
        {data?.totals.billableValue !== null ? (
          <StatCard
            icon={ReceiptText}
            label="Billable value"
            value={(data?.totals.billableValue ?? 0).toFixed(2)}
          />
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-extrabold">Hours by member</h2>
          <div className="mt-4 space-y-3">
            {data?.members.map((member) => (
              <div
                className="bg-surface flex items-center justify-between rounded-xl p-3"
                key={member.membershipId}
              >
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-muted text-xs">
                    {member.role?.replace('_', ' ')}
                  </p>
                </div>
                <p className="font-extrabold">{member.hours.toFixed(2)}h</p>
              </div>
            ))}
          </div>
        </section>
        <section className="border-border rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-extrabold">Hours by project</h2>
          <div className="mt-4 space-y-3">
            {data?.projects.map((project) => (
              <div
                className="bg-surface flex items-center justify-between rounded-xl p-3"
                key={project.projectId}
              >
                <p className="font-bold">{project.name}</p>
                <p className="font-extrabold">{project.hours.toFixed(2)}h</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
