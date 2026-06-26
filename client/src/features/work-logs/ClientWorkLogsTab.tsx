import type { Client, WorkLog } from '@clientflow/shared';
import { Clock3, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { formatMoney } from '../projects/project.utils';
import { WorkLogActions } from './WorkLogActions';
import { WorkLogBillingBadge } from './WorkLogBillingBadge';
import { WorkLogDeleteDialog } from './WorkLogDeleteDialog';
import { WorkLogFormDialog } from './WorkLogFormDialog';
import { useWorkLogs } from './work-log.queries';
import { WorkLogTimerPanel } from './WorkLogTimerPanel';
import { formatHours, formatWorkLogDate } from './work-log.utils';

export function ClientWorkLogsTab({ client }: { client: Client }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [deletingWorkLog, setDeletingWorkLog] = useState<WorkLog | null>(null);
  const workLogsQuery = useWorkLogs({
    search: '',
    billable: 'all',
    clientId: client.id,
    projectId: '',
    startDate: '',
    endDate: '',
  });
  const activeTimer = workLogsQuery.data?.activeTimer ?? null;
  const workLogs = workLogsQuery.data?.workLogs ?? [];

  const openCreate = () => {
    setEditingWorkLog(null);
    setFormOpen(true);
  };

  const openEdit = (workLog: WorkLog) => {
    setEditingWorkLog(workLog);
    setFormOpen(true);
  };

  return (
    <>
      <WorkLogTimerPanel
        activeTimer={activeTimer}
        defaultClientId={client.id}
      />

      <Card className="mt-5 overflow-hidden">
        <div className="border-border flex items-start justify-between gap-4 border-b p-5 sm:items-center">
          <div>
            <h2 className="font-extrabold">Work logs for {client.name}</h2>
            <p className="text-muted mt-1 text-sm">
              Daily notes, hours, billing status, and client-visible history.
            </p>
          </div>
          <Button
            disabled={Boolean(activeTimer)}
            onClick={openCreate}
            size="sm"
          >
            <Plus className="size-4" /> Add work log
          </Button>
        </div>

        {workLogsQuery.isLoading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton className="h-52 rounded-2xl" key={index} />
            ))}
          </div>
        ) : workLogsQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <p className="font-extrabold">Work logs could not be loaded.</p>
            <Button
              className="mt-4"
              onClick={() => void workLogsQuery.refetch()}
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : workLogs.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Log first entry
              </Button>
            }
            description="Start tracking hours for this client so reports and invoices have clean source data."
            icon={Clock3}
            title="No work logs for this client"
          />
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {workLogs.map((workLog) => (
              <ClientWorkLogCard
                key={workLog.id}
                onDelete={() => setDeletingWorkLog(workLog)}
                onEdit={() => openEdit(workLog)}
                workLog={workLog}
              />
            ))}
          </div>
        )}
      </Card>

      <WorkLogFormDialog
        defaultClientId={client.id}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingWorkLog(null);
        }}
        open={formOpen}
        workLog={editingWorkLog}
      />
      <WorkLogDeleteDialog
        onOpenChange={(open) => {
          if (!open) setDeletingWorkLog(null);
        }}
        open={Boolean(deletingWorkLog)}
        workLog={deletingWorkLog}
      />
    </>
  );
}

function ClientWorkLogCard({
  onDelete,
  onEdit,
  workLog,
}: {
  onDelete: () => void;
  onEdit: () => void;
  workLog: WorkLog;
}) {
  return (
    <div className="border-border rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft/40 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Clock3 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{workLog.title}</p>
          <p className="text-muted mt-1 text-sm">
            {workLog.project.name} · {formatWorkLogDate(workLog.workDate)}
          </p>
        </div>
        <WorkLogActions onDelete={onDelete} onEdit={onEdit} workLog={workLog} />
      </div>

      {workLog.description ? (
        <p className="text-muted mt-4 line-clamp-3 text-sm leading-6">
          {workLog.description}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <WorkLogBillingBadge billable={workLog.billable} />
        <Badge variant="neutral">{formatHours(workLog.durationHours)}</Badge>
        {workLog.billable ? (
          <Badge variant="neutral">
            {formatMoney(workLog.amount, workLog.currency)}
          </Badge>
        ) : null}
        {workLog.category ? (
          <Badge variant="neutral">{workLog.category}</Badge>
        ) : null}
      </div>
    </div>
  );
}
