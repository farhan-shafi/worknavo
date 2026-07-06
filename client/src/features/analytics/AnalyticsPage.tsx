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
    capacityHours: number;
    plannedHours: number;
    remainingCapacityHours: number;
    plannedUtilization: number;
    loggedUtilization: number;
  };
  members: Array<{
    membershipId: string;
    name: string;
    role: string | null;
    hours: number;
    billableHours: number;
    billableValue: number | null;
    capacity: number | null;
    plannedHours: number;
    remainingCapacity: number | null;
    plannedUtilization: number;
    loggedUtilization: number;
  }>;
  projects: Array<{
    projectId: string;
    name: string;
    hours: number;
    billableHours: number;
    billableValue: number | null;
    plannedHours: number;
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        <StatCard
          icon={Clock3}
          label="Weekly capacity"
          value={`${(data?.totals.capacityHours ?? 0).toFixed(2)}h`}
        />
        <StatCard
          icon={BarChart3}
          label="Planned utilization"
          value={`${(data?.totals.plannedUtilization ?? 0).toFixed(1)}%`}
        />
      </div>
      <section className="border-border rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold">Capacity forecast</h2>
            <p className="text-muted text-sm">
              Planned hours compare project assignments against member weekly
              capacity.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-extrabold">
              {(data?.totals.plannedHours ?? 0).toFixed(2)}h planned
            </p>
            <p className="text-muted text-xs">
              {(data?.totals.remainingCapacityHours ?? 0).toFixed(2)}h remaining
              capacity · {(data?.totals.loggedUtilization ?? 0).toFixed(1)}%
              logged
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-extrabold">Member utilization</h2>
          <div className="mt-4 space-y-3">
            {data?.members.map((member) => (
              <div
                className="bg-surface flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"
                key={member.membershipId}
              >
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-muted text-xs">
                    {member.role?.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-extrabold">
                    {member.hours.toFixed(2)}h logged
                  </p>
                  <p className="text-muted text-xs">
                    {member.plannedHours.toFixed(2)}h planned
                    {member.capacity === null
                      ? ''
                      : ` / ${member.capacity.toFixed(2)}h capacity`}
                  </p>
                  <p className="text-muted text-xs">
                    {member.plannedUtilization.toFixed(1)}% planned ·{' '}
                    {member.loggedUtilization.toFixed(1)}% logged
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="border-border rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-extrabold">Project forecast</h2>
          <div className="mt-4 space-y-3">
            {data?.projects.map((project) => (
              <div
                className="bg-surface flex items-center justify-between rounded-xl p-3"
                key={project.projectId}
              >
                <p className="font-bold">{project.name}</p>
                <div className="text-right">
                  <p className="font-extrabold">
                    {project.hours.toFixed(2)}h logged
                  </p>
                  <p className="text-muted text-xs">
                    {project.plannedHours.toFixed(2)}h planned
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
