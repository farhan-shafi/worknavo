import type { WorkLog, WorkLogBillingFilter } from '@clientflow/shared';
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Copy,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  DataTable,
  type DataTableColumn,
} from '../../components/shared/DataTable';
import { ErrorState } from '../../components/shared/ErrorState';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { useClients } from '../clients/client.queries';
import { useProjects } from '../projects/project.queries';
import { formatMoney } from '../projects/project.utils';
import { WorkLogActions } from './WorkLogActions';
import { WorkLogBillingBadge } from './WorkLogBillingBadge';
import { WorkLogDeleteDialog } from './WorkLogDeleteDialog';
import { WorkLogDetailDialog } from './WorkLogDetailDialog';
import { WorkLogFormDialog } from './WorkLogFormDialog';
import { useWorkLogs } from './work-log.queries';
import { WorkLogTimerPanel } from './WorkLogTimerPanel';
import { formatHours, formatWorkLogDate } from './work-log.utils';

export function WorkLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [billable, setBillable] = useState<WorkLogBillingFilter>('all');
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '');
  const [projectId, setProjectId] = useState(
    searchParams.get('projectId') ?? '',
  );
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') ?? '',
  );
  const [endDate, setEndDate] = useState(searchParams.get('endDate') ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [templateWorkLog, setTemplateWorkLog] = useState<WorkLog | null>(null);
  const [deletingWorkLog, setDeletingWorkLog] = useState<WorkLog | null>(null);
  const [viewingWorkLog, setViewingWorkLog] = useState<WorkLog | null>(null);
  const createRequested = searchParams.get('new') === '1';
  const clientsQuery = useClients({ search: '', status: 'all' });
  const projectsQuery = useProjects({
    clientId,
    search: '',
    status: 'all',
  });
  const workLogsQuery = useWorkLogs({
    search: deferredSearch,
    billable,
    clientId,
    projectId,
    startDate,
    endDate,
  });
  useEffect(() => {
    if (createRequested) {
      setEditingWorkLog(null);
      setFormOpen(true);
    }
  }, [createRequested]);

  const closeForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingWorkLog(null);
      setTemplateWorkLog(null);
      if (searchParams.has('new')) {
        const next = new URLSearchParams(searchParams);
        next.delete('new');
        setSearchParams(next, { replace: true });
      }
    }
  };

  const openCreate = () => {
    setEditingWorkLog(null);
    setTemplateWorkLog(null);
    setFormOpen(true);
  };

  const openEdit = (workLog: WorkLog) => {
    setEditingWorkLog(workLog);
    setTemplateWorkLog(null);
    setFormOpen(true);
  };

  const openDuplicate = (workLog: WorkLog) => {
    setEditingWorkLog(null);
    setTemplateWorkLog(workLog);
    setFormOpen(true);
  };

  const columns: Array<DataTableColumn<WorkLog>> = [
    {
      key: 'work',
      header: 'Work',
      render: (workLog) => (
        <div>
          <p className="font-extrabold">{workLog.title}</p>
          <p className="text-muted mt-0.5 max-w-72 truncate text-xs">
            {workLog.description || workLog.category || 'No notes'}
          </p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (workLog) => (
        <Link
          className="hover:text-primary font-bold transition"
          to={`/app/clients/${workLog.clientId}`}
        >
          {workLog.client.name}
        </Link>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (workLog) => (
        <span className="font-bold">{workLog.project.name}</span>
      ),
    },
    {
      key: 'hours',
      header: 'Hours',
      render: (workLog) => (
        <span className="font-bold">{formatHours(workLog.durationHours)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Value',
      render: (workLog) => (
        <span className="text-muted">
          {workLog.billable
            ? formatMoney(workLog.amount, workLog.currency)
            : 'Non-billable'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (workLog) => (
        <span className="text-muted text-xs">
          {formatWorkLogDate(workLog.workDate)}
        </span>
      ),
    },
    {
      key: 'billing',
      header: 'Billing',
      render: (workLog) => <WorkLogBillingBadge billable={workLog.billable} />,
    },
    {
      key: 'proof',
      header: 'Proof',
      render: (workLog) =>
        workLog.timerStartLocation || workLog.timerStopLocation ? (
          <Badge variant="success">
            <MapPin className="size-3" /> GPS
          </Badge>
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-14 text-right',
      render: (workLog) => (
        <WorkLogActions
          onDelete={() => setDeletingWorkLog(workLog)}
          onDuplicate={() => openDuplicate(workLog)}
          onEdit={() => openEdit(workLog)}
          onView={() => setViewingWorkLog(workLog)}
          workLog={workLog}
        />
      ),
    },
  ];

  const workLogs = workLogsQuery.data?.workLogs ?? [];
  const activeTimer = workLogsQuery.data?.activeTimer ?? null;
  const clients = clientsQuery.data?.clients ?? [];
  const projects = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data?.projects],
  );
  const counts = workLogsQuery.data?.counts ?? {
    all: 0,
    billable: 0,
    nonBillable: 0,
  };
  const summary = workLogsQuery.data?.summary ?? {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    billableAmount: 0,
  };
  const hasFilters =
    Boolean(deferredSearch) ||
    billable !== 'all' ||
    Boolean(clientId) ||
    Boolean(projectId) ||
    Boolean(startDate) ||
    Boolean(endDate);
  const hasProjects = projects.length > 0 || Boolean(projectId);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    if (!projects.some((project) => project.id === projectId)) {
      setProjectId('');
    }
  }, [projectId, projects]);

  return (
    <div>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={workLogs.length === 0 || Boolean(activeTimer)}
              onClick={() => {
                const latestWorkLog = workLogs[0];
                if (latestWorkLog) {
                  openDuplicate(latestWorkLog);
                }
              }}
              variant="secondary"
            >
              <Copy className="size-4" /> Duplicate last
            </Button>
            <Button
              disabled={!clients.length || !hasProjects || Boolean(activeTimer)}
              onClick={openCreate}
            >
              <Plus className="size-4" /> Add work log
            </Button>
          </div>
        }
        description="Track daily deliverables, dates, hours, and billable value so reports and invoices stay accurate."
        eyebrow="Work logs"
        title="Daily work tracking"
      />

      <WorkLogTimerPanel activeTimer={activeTimer} />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Logged entries"
          value={String(counts.all)}
        />
        <StatCard
          icon={Clock3}
          label="Filtered hours"
          value={formatHours(summary.totalHours)}
        />
        <StatCard
          icon={BriefcaseBusiness}
          label="Billable hours"
          value={formatHours(summary.billableHours)}
        />
        <StatCard
          icon={CalendarDays}
          label="Non-billable hours"
          value={formatHours(summary.nonBillableHours)}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(
          [
            ['all', 'All work logs', counts.all],
            ['billable', 'Billable', counts.billable],
            ['non-billable', 'Non-billable', counts.nonBillable],
          ] as const
        ).map(([value, label, count]) => (
          <button
            className={`rounded-2xl border p-4 text-left transition ${
              billable === value
                ? 'border-primary/25 bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/20 bg-white'
            }`}
            key={value}
            onClick={() => setBillable(value)}
            type="button"
          >
            <p className="text-muted text-xs font-bold">{label}</p>
            <p className="mt-2 text-2xl font-extrabold">{count}</p>
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-border grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px_170px_170px]">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Search work logs"
              className="pl-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search summary, notes, category, or tags…"
              value={search}
            />
          </div>
          <Select
            aria-label="Filter work logs by client"
            onChange={(event) => {
              setClientId(event.target.value);
              setProjectId('');
            }}
            value={clientId}
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter work logs by project"
            onChange={(event) => setProjectId(event.target.value)}
            value={projectId}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Start date"
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
          <Input
            aria-label="End date"
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </div>

        {workLogsQuery.isLoading ? (
          <WorkLogListSkeleton />
        ) : workLogsQuery.isError ? (
          <ErrorState
            description="Tracked work is temporarily unavailable. Confirm the API and database are connected, then retry."
            onRetry={() => void workLogsQuery.refetch()}
            title="Work logs could not be loaded"
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable
                columns={columns}
                emptyAction={
                  !hasFilters && clients.length > 0 && hasProjects ? (
                    <Button onClick={openCreate}>
                      <Plus className="size-4" /> Add your first work log
                    </Button>
                  ) : undefined
                }
                emptyDescription={
                  hasFilters
                    ? 'Try changing the search, client, project, or date range.'
                    : 'Add a work log to capture the real hours behind reports and invoices.'
                }
                emptyIcon={Clock3}
                emptyTitle={
                  hasFilters
                    ? 'No work logs match these filters'
                    : 'No work logs yet'
                }
                getRowKey={(workLog) => workLog.id}
                rows={workLogs}
              />
            </div>
            <div className="divide-border divide-y lg:hidden">
              {workLogs.length > 0 ? (
                workLogs.map((workLog) => (
                  <WorkLogMobileCard
                    key={workLog.id}
                    onDelete={() => setDeletingWorkLog(workLog)}
                    onDuplicate={() => openDuplicate(workLog)}
                    onEdit={() => openEdit(workLog)}
                    onView={() => setViewingWorkLog(workLog)}
                    workLog={workLog}
                  />
                ))
              ) : (
                <div className="px-5 py-14 text-center">
                  <span className="bg-surface-strong text-primary mx-auto grid size-12 place-items-center rounded-2xl">
                    <Clock3 className="size-5" />
                  </span>
                  <p className="mt-4 font-extrabold">
                    {hasFilters
                      ? 'No work logs match these filters'
                      : 'No work logs yet'}
                  </p>
                  <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                    {hasFilters
                      ? 'Try changing the search, client, project, or date range.'
                      : 'Add a work log to capture the real hours behind reports and invoices.'}
                  </p>
                  {!hasFilters && clients.length > 0 && hasProjects ? (
                    <Button className="mt-5" onClick={openCreate}>
                      <Plus className="size-4" /> Add your first work log
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <WorkLogFormDialog
        defaultClientId={clientId || undefined}
        defaultProjectId={projectId || undefined}
        onOpenChange={closeForm}
        open={formOpen}
        templateWorkLog={templateWorkLog}
        workLog={editingWorkLog}
      />
      <WorkLogDeleteDialog
        onOpenChange={(open) => {
          if (!open) setDeletingWorkLog(null);
        }}
        open={Boolean(deletingWorkLog)}
        workLog={deletingWorkLog}
      />
      <WorkLogDetailDialog
        onOpenChange={(open) => {
          if (!open) setViewingWorkLog(null);
        }}
        open={Boolean(viewingWorkLog)}
        workLog={viewingWorkLog}
      />
    </div>
  );
}

function WorkLogMobileCard({
  onDelete,
  onDuplicate,
  onEdit,
  onView,
  workLog,
}: {
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onView: () => void;
  workLog: WorkLog;
}) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft/40 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Clock3 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{workLog.title}</p>
          <Link
            className="text-muted hover:text-primary mt-0.5 block text-sm transition"
            to={`/app/clients/${workLog.clientId}`}
          >
            {workLog.client.name}
          </Link>
        </div>
        <WorkLogActions
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onView={onView}
          workLog={workLog}
        />
      </div>
      <div className="text-muted mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4" />
          {workLog.project.name}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          {formatWorkLogDate(workLog.workDate)}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <WorkLogBillingBadge billable={workLog.billable} />
        {workLog.timerStartLocation || workLog.timerStopLocation ? (
          <Badge variant="success">
            <MapPin className="size-3" /> GPS
          </Badge>
        ) : null}
        <Badge variant="neutral">{formatHours(workLog.durationHours)}</Badge>
        {workLog.billable ? (
          <Badge variant="neutral">
            {formatMoney(workLog.amount, workLog.currency)}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function WorkLogListSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="border-border flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
          key={index}
        >
          <Skeleton className="size-9 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
