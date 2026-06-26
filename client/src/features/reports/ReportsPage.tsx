import type { WeeklyReport, WeeklyReportStatus } from '@clientflow/shared';
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Clock3,
  Plus,
} from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';

import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { useClients } from '../clients/client.queries';
import { ReportCard } from './ReportCard';
import { ReportDeleteDialog } from './ReportDeleteDialog';
import { ReportFormDialog } from './ReportFormDialog';
import { useWeeklyReports } from './report.queries';
import { useAuth } from '../auth/use-auth';

export function ReportsPage() {
  const { permissions } = useAuth();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<WeeklyReportStatus | 'all'>('all');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [deletingReport, setDeletingReport] = useState<WeeklyReport | null>(
    null,
  );

  const clientsQuery = useClients({ search: '', status: 'all' });
  const reportsQuery = useWeeklyReports({
    search: deferredSearch,
    status,
    clientId,
    startDate,
    endDate,
  });
  const reports = reportsQuery.data?.reports ?? [];
  const counts = reportsQuery.data?.counts ?? {
    all: 0,
    draft: 0,
    final: 0,
  };
  const hasFilters =
    Boolean(deferredSearch) ||
    status !== 'all' ||
    Boolean(clientId) ||
    Boolean(startDate) ||
    Boolean(endDate);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    if (!clientsQuery.data?.clients.some((client) => client.id === clientId)) {
      setClientId('');
    }
  }, [clientId, clientsQuery.data?.clients]);

  const openCreate = () => {
    setEditingReport(null);
    setFormOpen(true);
  };

  const openEdit = (report: WeeklyReport) => {
    setEditingReport(report);
    setFormOpen(true);
  };

  const totalHours = reports.reduce(
    (sum, report) => sum + report.totalHours,
    0,
  );

  return (
    <div>
      <PageHeader
        actions={
          permissions.includes('reports.manage') ? (
            <Button
              disabled={!clientsQuery.data?.clients.length}
              onClick={openCreate}
            >
              <Plus className="size-4" /> Add report
            </Button>
          ) : null
        }
        description="Draft weekly summaries from logged work, then finalize them when they are ready to share."
        eyebrow="Reports"
        title="Weekly reporting"
      />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Reports" value={String(counts.all)} />
        <StatCard
          icon={CheckCircle2}
          label="Final reports"
          value={String(counts.final)}
        />
        <StatCard
          icon={CalendarDays}
          label="Draft reports"
          value={String(counts.draft)}
        />
        <StatCard
          icon={Clock3}
          label="Hours summarized"
          value={`${totalHours.toFixed(2)}h`}
        />
      </div>

      <Card className="mt-6 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <label className="block">
            <span className="text-muted mb-2 block text-xs font-bold uppercase">
              Search
            </span>
            <Input
              placeholder="Search title, summary, or highlights"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-2 block text-xs font-bold uppercase">
              Status
            </span>
            <Select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as WeeklyReportStatus | 'all')
              }
            >
              <option value="all">All reports</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </Select>
          </label>
          <label className="block">
            <span className="text-muted mb-2 block text-xs font-bold uppercase">
              Client
            </span>
            <Select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">All clients</option>
              {clientsQuery.data?.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="text-muted mb-2 block text-xs font-bold uppercase">
              Start
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-2 block text-xs font-bold uppercase">
              End
            </span>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
      </Card>

      {reportsQuery.isLoading ? (
        <div className="mt-5 grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton className="h-72 rounded-2xl" key={index} />
          ))}
        </div>
      ) : reportsQuery.isError ? (
        <Card className="mt-5 overflow-hidden">
          <ErrorState
            description="Weekly reports are temporarily unavailable. Confirm the API and database are connected, then retry."
            onRetry={() => void reportsQuery.refetch()}
            title="Reports could not be loaded"
          />
        </Card>
      ) : reports.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            action={
              <Button
                disabled={!clientsQuery.data?.clients.length}
                onClick={openCreate}
              >
                <Plus className="size-4" /> Create report
              </Button>
            }
            description={
              hasFilters
                ? 'No reports match the current filters. Try widening the date range or clearing the search.'
                : 'Create weekly summaries from work logs so client updates are ready faster.'
            }
            icon={FileText}
            title={hasFilters ? 'No matching reports' : 'No reports yet'}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              onDelete={() => setDeletingReport(report)}
              onEdit={() => openEdit(report)}
              report={report}
            />
          ))}
        </div>
      )}

      <ReportFormDialog
        defaultClientId={clientId || undefined}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingReport(null);
        }}
        open={formOpen}
        report={editingReport}
      />
      <ReportDeleteDialog
        onOpenChange={(open) => {
          if (!open) setDeletingReport(null);
        }}
        open={Boolean(deletingReport)}
        report={deletingReport}
      />
    </div>
  );
}
