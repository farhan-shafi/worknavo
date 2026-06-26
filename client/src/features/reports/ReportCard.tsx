import type { WeeklyReport } from '@clientflow/shared';
import { CalendarDays, Clock3, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { ReportActions } from './ReportActions';
import { ReportStatusBadge } from './ReportStatusBadge';
import { formatReportRange } from './report.utils';

export function ReportCard({
  onDelete,
  onEdit,
  report,
}: {
  onDelete: () => void;
  onEdit: () => void;
  report: WeeklyReport;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ReportStatusBadge status={report.status} />
            <Badge variant="neutral">{report.workLogCount} work logs</Badge>
            <Badge variant="neutral">
              {report.totalHours.toFixed(2)}h total
            </Badge>
          </div>

          <h3 className="mt-4 text-lg font-extrabold">{report.title}</h3>
          <p className="text-muted mt-1 text-sm">
            <Link
              className="text-foreground hover:text-primary font-bold transition"
              to={`/app/clients/${report.clientId}`}
            >
              {report.client.companyName
                ? `${report.client.name} · ${report.client.companyName}`
                : report.client.name}
            </Link>
          </p>
          <p className="text-muted mt-2 flex items-center gap-2 text-xs">
            <CalendarDays className="size-3.5" />
            {formatReportRange(report.weekStart, report.weekEnd)}
          </p>
        </div>

        <ReportActions onDelete={onDelete} onEdit={onEdit} report={report} />
      </div>

      <div className="border-border border-t px-5 py-4">
        <p className="text-muted line-clamp-3 text-sm leading-6">
          {report.summary}
        </p>

        {report.highlights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {report.highlights.map((highlight) => (
              <Badge key={highlight} variant="primary">
                {highlight}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="text-muted mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-3.5" />
            Generated {new Date(report.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            Updated {new Date(report.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
}
