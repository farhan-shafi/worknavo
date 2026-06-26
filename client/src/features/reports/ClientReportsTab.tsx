import type { Client, WeeklyReport } from '@clientflow/shared';
import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { ReportCard } from './ReportCard';
import { ReportDeleteDialog } from './ReportDeleteDialog';
import { ReportFormDialog } from './ReportFormDialog';
import { useWeeklyReports } from './report.queries';

export function ClientReportsTab({ client }: { client: Client }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [deletingReport, setDeletingReport] = useState<WeeklyReport | null>(
    null,
  );
  const reportsQuery = useWeeklyReports({
    search: '',
    status: 'all',
    clientId: client.id,
    startDate: '',
    endDate: '',
  });
  const reports = reportsQuery.data?.reports ?? [];

  const openCreate = () => {
    setEditingReport(null);
    setFormOpen(true);
  };

  const openEdit = (report: WeeklyReport) => {
    setEditingReport(report);
    setFormOpen(true);
  };

  return (
    <>
      <Card className="mt-5 overflow-hidden">
        <div className="border-border flex items-start justify-between gap-4 border-b p-5 sm:items-center">
          <div>
            <h2 className="font-extrabold">Reports for {client.name}</h2>
            <p className="text-muted mt-1 text-sm">
              Weekly summaries, highlights, and draft/final status for this
              client.
            </p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4" /> Add report
          </Button>
        </div>

        {reportsQuery.isLoading ? (
          <div className="grid gap-4 p-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton className="h-72 rounded-2xl" key={index} />
            ))}
          </div>
        ) : reportsQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <p className="font-extrabold">Reports could not be loaded.</p>
            <Button
              className="mt-4"
              onClick={() => void reportsQuery.refetch()}
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Create first report
              </Button>
            }
            description="Turn this client's logged work into a weekly summary that can be refined before sharing."
            icon={FileText}
            title="No reports for this client"
          />
        ) : (
          <div className="space-y-4 p-5">
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
      </Card>

      <ReportFormDialog
        defaultClientId={client.id}
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
    </>
  );
}
