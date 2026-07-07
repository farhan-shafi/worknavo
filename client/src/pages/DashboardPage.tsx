import type { WorkLog } from '@clientflow/shared';
import {
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNowStrict,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  Clock3,
  History,
  PauseCircle,
  PieChart as PieChartIcon,
  Plus,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartCard } from '../components/shared/ChartCard';
import { EmptyState } from '../components/shared/EmptyState';
import { PageHeader } from '../components/shared/PageHeader';
import { StatCard } from '../components/shared/StatCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../features/auth/use-auth';
import { useClients } from '../features/clients/client.queries';
import { useProjects } from '../features/projects/project.queries';
import { useWorkLogs } from '../features/work-logs/work-log.queries';
import {
  formatElapsedDuration,
  formatHours,
  formatWorkLogDate,
} from '../features/work-logs/work-log.utils';

const chartPalette = {
  billable: '#e35d22',
  nonBillable: '#f5c7ad',
};

export function DashboardPage() {
  const { membership, permissions, user } = useAuth();
  const navigate = useNavigate();
  const clientsQuery = useClients({ search: '', status: 'all' });
  const projectsQuery = useProjects({
    clientId: '',
    search: '',
    status: 'all',
  });
  const workLogsQuery = useWorkLogs({
    search: '',
    billable: 'all',
    clientId: '',
    projectId: '',
    startDate: '',
    endDate: '',
  });
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const totalClients = clientsQuery.data?.counts.all ?? 0;
  const hasClients = totalClients > 0;
  const totalProjects = projectsQuery.data?.counts.all ?? 0;
  const activeProjects = projectsQuery.data?.counts.active ?? 0;
  const hasProjects = totalProjects > 0;
  const workLogs = workLogsQuery.data?.workLogs ?? [];
  const activeTimer = workLogsQuery.data?.activeTimer ?? null;
  const summary = workLogsQuery.data?.summary ?? {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    billableAmount: 0,
  };
  const hasWorkLogs = workLogs.length > 0;
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthHours = workLogs.reduce((total, workLog) => {
    const workDate = new Date(workLog.workDate);
    return workDate >= monthStart && workDate <= monthEnd
      ? total + workLog.durationHours
      : total;
  }, 0);
  const recentWorkLogs = workLogs.slice(0, 4);
  const billableEntries = workLogs.filter((workLog) => workLog.billable).length;
  const averageLogHours = workLogs.length
    ? summary.totalHours / workLogs.length
    : 0;
  const weeklyTrendData = buildWeeklyTrend(workLogs);
  const topClients = buildTopClients(workLogs);
  const topClientHours = topClients[0]?.hours ?? 0;
  const billableSplit = [
    {
      name: 'Billable',
      value: summary.billableHours,
      color: chartPalette.billable,
    },
    {
      name: 'Non-billable',
      value: summary.nonBillableHours,
      color: chartPalette.nonBillable,
    },
  ];
  const stats = [
    {
      label: 'Total clients',
      value: clientsQuery.isLoading ? '—' : String(totalClients),
      icon: UsersRound,
      footer: hasClients
        ? 'Managed in your workspace'
        : 'Add your first client',
    },
    {
      label: 'Active projects',
      value: projectsQuery.isLoading ? '—' : String(activeProjects),
      icon: BriefcaseBusiness,
      footer: hasProjects
        ? `${totalProjects} total projects`
        : 'Create a project',
    },
    {
      label: 'Hours this month',
      value: workLogsQuery.isLoading ? '—' : formatHours(monthHours),
      icon: Clock3,
      footer: hasWorkLogs
        ? `${recentWorkLogs.length} recent work log${recentWorkLogs.length === 1 ? '' : 's'}`
        : 'Add your first work log',
    },
    {
      label: 'Billable entries',
      value: workLogsQuery.isLoading ? '—' : String(billableEntries),
      icon: CircleDollarSign,
      footer: hasWorkLogs
        ? `${formatHours(averageLogHours)} average log length`
        : 'Analytics improve as you track work',
    },
  ];
  const setupSteps = [
    {
      title: 'Account secured',
      description: 'Registration and session protection are active',
      complete: true,
    },
    {
      title: 'Add your first client',
      description: hasClients
        ? `${totalClients} client${totalClients === 1 ? '' : 's'} in your workspace`
        : 'Create the relationship that projects and invoices will use',
      complete: hasClients,
    },
    {
      title: 'Create a project',
      description: hasProjects
        ? `${totalProjects} project${totalProjects === 1 ? '' : 's'} connected to client work`
        : 'Connect rates and budgets to client work',
      complete: hasProjects,
    },
    {
      title: 'Log billable work',
      description: 'Turn daily work into reports and invoices',
      complete: hasWorkLogs,
    },
  ];
  const completedSteps = setupSteps.filter((step) => step.complete).length;

  return (
    <div>
      <PageHeader
        actions={
          <>
            {permissions.includes('projects.manage') &&
            ['owner', 'admin'].includes(membership?.role ?? '') ? (
              <Button
                disabled={!hasClients}
                onClick={() => navigate('/app/projects?new=1')}
                variant="secondary"
              >
                <Plus className="size-4" /> Add project
              </Button>
            ) : null}
            <Button
              onClick={() =>
                navigate(hasProjects ? '/app/work-logs?new=1' : '/app/projects')
              }
            >
              {hasProjects ? (
                <Clock3 className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}{' '}
              {hasProjects ? 'Add work log' : 'View projects'}
            </Button>
          </>
        }
        description={
          membership?.role === 'member'
            ? 'Track your assigned work, monitor your personal hours, and keep your week moving.'
            : membership?.role === 'project_manager'
              ? 'Monitor assigned projects, team activity, and delivery capacity without exposing restricted financials.'
              : membership?.role === 'finance'
                ? 'Review billable work, invoice progress, and outstanding client revenue.'
                : 'Monitor organization work, project health, utilization, and billing from one workspace.'
        }
        eyebrow="Workspace overview"
        title={`Good to see you, ${firstName}.`}
      />

      {activeTimer ? (
        <RunningTimerBanner
          onOpen={() => navigate('/app/work-logs')}
          timerTitle={activeTimer.title}
          startedAt={activeTimer.timerStartedAt ?? activeTimer.createdAt}
        />
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ChartCard
          action={<Badge variant="neutral">Last 6 weeks</Badge>}
          description="Billable and non-billable hours across recent weeks"
          title="Weekly trend"
        >
          {hasWorkLogs ? (
            <div className="h-[300px] px-3 py-4">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={weeklyTrendData}>
                  <CartesianGrid
                    stroke="#eadfd3"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 700 }}
                    tickFormatter={(value) => `${value}h`}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={<HoursTooltip />}
                    cursor={{ fill: '#fff7ee' }}
                  />
                  <Bar
                    dataKey="billable"
                    fill={chartPalette.billable}
                    name="Billable"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="nonBillable"
                    fill={chartPalette.nonBillable}
                    name="Non-billable"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              compact
              description="Once you have a few work logs, this chart will show your weekly rhythm."
              icon={Clock3}
              title="No time trend yet"
            />
          )}
        </ChartCard>

        <ChartCard
          action={
            <Badge variant="neutral">{formatHours(summary.totalHours)}</Badge>
          }
          description="How your tracked hours split between client work and internal effort"
          title="Billable split"
        >
          {hasWorkLogs ? (
            <div className="grid items-center gap-2 p-4 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="h-[220px]">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={billableSplit}
                      dataKey="value"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {billableSplit.map((entry) => (
                        <Cell fill={entry.color} key={entry.name} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {billableSplit.map((entry) => (
                  <div
                    className="border-border flex items-center justify-between rounded-2xl border p-3"
                    key={entry.name}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <p className="font-bold">{entry.name}</p>
                    </div>
                    <p className="text-muted text-sm font-semibold">
                      {formatHours(entry.value)}
                    </p>
                  </div>
                ))}
                <div className="bg-surface rounded-2xl p-4">
                  <p className="text-muted text-xs font-bold">
                    Average completed log
                  </p>
                  <p className="mt-2 text-2xl font-extrabold">
                    {formatHours(averageLogHours)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              description="Your billable split appears after the first tracked entries land."
              icon={PieChartIcon}
              title="No split yet"
            />
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <ChartCard
          action={<Badge variant="neutral">Top 5</Badge>}
          description="Which clients are consuming the most hours recently"
          title="Client workload"
        >
          {topClients.length > 0 ? (
            <div className="space-y-4 p-6">
              {topClients.map((client) => (
                <div key={client.name}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{client.name}</p>
                    <p className="text-muted text-sm font-semibold">
                      {formatHours(client.hours)}
                    </p>
                  </div>
                  <div className="bg-surface mt-2 h-2.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width:
                          topClientHours > 0
                            ? `${Math.max(
                                10,
                                (client.hours / topClientHours) * 100,
                              )}%`
                            : '100%',
                      }}
                    />
                  </div>
                  <p className="text-muted mt-1 text-xs">
                    {formatHours(client.billableHours)} billable
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              description="Client workload ranking will show up after a few tracked sessions."
              icon={UsersRound}
              title="No client workload yet"
            />
          )}
        </ChartCard>

        <ChartCard
          action={
            <Button
              onClick={() =>
                navigate(
                  hasWorkLogs
                    ? '/app/work-logs'
                    : hasProjects
                      ? '/app/projects'
                      : '/app/clients',
                )
              }
              size="sm"
              variant="ghost"
            >
              View all
            </Button>
          }
          description="The latest tracked work inside your workspace"
          title="Recent work logs"
        >
          {hasWorkLogs ? (
            <div className="space-y-3 p-4">
              {recentWorkLogs.map((workLog) => (
                <div
                  className="border-border flex items-center justify-between gap-3 rounded-2xl border p-3"
                  key={workLog.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{workLog.title}</p>
                    <p className="text-muted mt-1 text-xs">
                      {workLog.client.name} ·{' '}
                      {formatWorkLogDate(workLog.workDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="neutral">
                      {formatHours(workLog.durationHours)}
                    </Badge>
                    <StatusBadge
                      dot={false}
                      tone={
                        workLog.entryMode === 'timer' ? 'primary' : 'neutral'
                      }
                    >
                      {workLog.entryMode === 'timer' ? 'Timer' : 'Manual'}
                    </StatusBadge>
                    <StatusBadge
                      tone={workLog.billable ? 'success' : 'neutral'}
                    >
                      {workLog.billable ? 'Billable' : 'Non-billable'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              description="Your most recent logged work will appear here as soon as you add the first entry."
              icon={History}
              title="No activity yet"
            />
          )}
        </ChartCard>
      </div>

      {['owner', 'admin'].includes(membership?.role ?? '') &&
      completedSteps < setupSteps.length ? (
        <Card className="mt-4 overflow-hidden">
          <div className="border-border flex items-start justify-between gap-4 border-b p-6">
            <div>
              <h2 className="font-extrabold">Set up your workflow</h2>
              <p className="text-muted mt-1 text-xs">
                Client first, clean invoice last.
              </p>
            </div>
            <Badge variant="primary">{completedSteps} of 4 complete</Badge>
          </div>
          <div className="divide-border divide-y px-6">
            {setupSteps.map(({ complete, description, title }, index) => (
              <div className="flex gap-4 py-5" key={title}>
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    complete
                      ? 'bg-success text-white'
                      : 'bg-surface-strong text-muted'
                  }`}
                >
                  {complete ? (
                    <Check className="size-4" />
                  ) : (
                    <span className="text-xs font-extrabold">{index + 1}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{title}</p>
                  <p className="text-muted mt-1 text-sm">{description}</p>
                </div>
                {!complete ? (
                  <ArrowRight className="text-muted size-4 self-center" />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function buildWeeklyTrend(workLogs: WorkLog[]) {
  return Array.from({ length: 6 }, (_, index) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 5 - index), {
      weekStartsOn: 1,
    });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    let billable = 0;
    let nonBillable = 0;

    for (const workLog of workLogs) {
      const workDate = new Date(workLog.workDate);
      if (workDate >= weekStart && workDate <= weekEnd) {
        if (workLog.billable) {
          billable += workLog.durationHours;
        } else {
          nonBillable += workLog.durationHours;
        }
      }
    }

    return {
      label: format(weekStart, 'MMM d'),
      billable: Number(billable.toFixed(2)),
      nonBillable: Number(nonBillable.toFixed(2)),
    };
  });
}

function buildTopClients(workLogs: WorkLog[]) {
  const byClient = new Map<
    string,
    { name: string; hours: number; billableHours: number }
  >();

  for (const workLog of workLogs) {
    const current = byClient.get(workLog.client.id) ?? {
      name: workLog.client.name,
      hours: 0,
      billableHours: 0,
    };
    current.hours += workLog.durationHours;
    if (workLog.billable) {
      current.billableHours += workLog.durationHours;
    }
    byClient.set(workLog.client.id, current);
  }

  return [...byClient.values()]
    .sort((left, right) => right.hours - left.hours)
    .slice(0, 5)
    .map((client) => ({
      ...client,
      hours: Number(client.hours.toFixed(2)),
      billableHours: Number(client.billableHours.toFixed(2)),
    }));
}

function HoursTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name: string; value: number; color: string }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="border-border rounded-2xl border bg-white p-3 shadow-xl">
      <p className="font-extrabold">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div
            className="flex items-center justify-between gap-4"
            key={entry.name}
          >
            <span
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: entry.color }}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="text-sm font-bold">
              {formatHours(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
}) {
  if (!active || !payload?.[0]) {
    return null;
  }

  const entry = payload[0];

  return (
    <div className="border-border rounded-2xl border bg-white p-3 shadow-xl">
      <p className="font-extrabold">{entry.name}</p>
      <p className="text-muted mt-1 text-sm">{formatHours(entry.value)}</p>
    </div>
  );
}

function RunningTimerBanner({
  onOpen,
  startedAt,
  timerTitle,
}: {
  onOpen: () => void;
  startedAt: string;
  timerTitle: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const startedDate = new Date(startedAt);

  return (
    <Card className="border-primary/20 bg-primary/8 mt-6 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
            Running timer
          </p>
          <h2 className="mt-2 text-lg font-extrabold">{timerTitle}</h2>
          <p className="text-muted mt-1 text-sm">
            Started{' '}
            {formatDistanceToNowStrict(startedDate, { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="primary">
            {formatElapsedDuration(now - startedDate.getTime())}
          </Badge>
          <Button onClick={onOpen} variant="secondary">
            <PauseCircle className="size-4" /> Open timer
          </Button>
        </div>
      </div>
    </Card>
  );
}
